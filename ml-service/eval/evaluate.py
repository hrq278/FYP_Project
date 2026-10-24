"""Evaluate every model the way the app uses it and write thesis-ready results to docs/results/.

Usage (from ml-service/):
  python eval/evaluate.py species --cattle <dir> [...] --not-cattle <dir> [...]
  python eval/evaluate.py breed   --test <breed test split dir>
  python eval/evaluate.py age     --project "F:/FYP/Models/Age Detection"
  python eval/evaluate.py health  --sets <dir> [...] [--teeth <age project>]
  python eval/evaluate.py summary            # rebuilds docs/results/README.md from the metrics files

Folder conventions
  species  --cattle: a breed test split (sub-folders named by breed; jaffarabadi / nili-ravi = buffalo) or any
           folder whose name contains "buffalo" (buffalo) / anything else (cow). --not-cattle: any image folders.
  breed    sub-folders named with the model's breed keys (same as cattle_breed.labels.json).
  health   labels from folder/file names, see scripts/eval_health.py (label_of).

Each command writes docs/results/<model>/metrics.json, classification_report.csv, confusion_matrix.png
(+ extras such as the unknown-animal threshold table). Datasets stay outside the repo (licences).
"""
import argparse
import csv
import json
import os
import sys
import time
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import matplotlib  # noqa: E402

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from sklearn.metrics import classification_report, confusion_matrix  # noqa: E402

from maweshi_ml.imaging import InvalidImage, decode_image, to_array  # noqa: E402
from maweshi_ml.registry import BASE_DIR, ModelRegistry, load_config  # noqa: E402

OUT = os.path.join(os.path.dirname(ROOT), "docs", "results")
EXT = (".jpg", ".jpeg", ".png", ".webp")
BUFFALO_BREEDS = {"jaffarabadi", "nili-ravi", "murrah", "kundi", "buffalo"}


# ---------- helpers ----------

def images_in(folder):
    for d, _, files in os.walk(folder):
        for f in sorted(files):
            if f.lower().endswith(EXT):
                yield os.path.join(d, f)


def load(path):
    try:
        with open(path, "rb") as f:
            return decode_image(f.read())
    except (InvalidImage, OSError):
        return None


class Timer:
    """Wall-clock time per call, in ms."""

    def __init__(self):
        self.ms = []

    def __call__(self, fn, *args, **kwargs):
        t = time.perf_counter()
        out = fn(*args, **kwargs)
        self.ms.append((time.perf_counter() - t) * 1000)
        return out

    def summary(self):
        a = np.array(self.ms[1:] or self.ms)  # first call includes graph tracing
        return {"mean_ms": round(float(a.mean()), 1), "p95_ms": round(float(np.percentile(a, 95)), 1), "calls": len(self.ms)}


def outdir(name):
    d = os.path.join(OUT, name)
    os.makedirs(d, exist_ok=True)
    return d


def save_json(d, data):
    with open(os.path.join(d, "metrics.json"), "w", encoding="utf8") as f:
        json.dump(data, f, indent=2)


def save_report(d, y, p, labels, filename="classification_report.csv"):
    rep = classification_report(y, p, labels=labels, output_dict=True, zero_division=0)
    with open(os.path.join(d, filename), "w", newline="", encoding="utf8") as f:
        w = csv.writer(f)
        w.writerow(["class", "precision", "recall", "f1", "support"])
        for k in labels + ["macro avg", "weighted avg"]:
            r = rep[k]
            w.writerow([k, f"{r['precision']:.3f}", f"{r['recall']:.3f}", f"{r['f1-score']:.3f}", int(r["support"])])
    return rep


def plot_confusion(d, y, p, labels, title, filename="confusion_matrix.png", pred_labels=None):
    pred_labels = pred_labels or labels
    all_labels = list(dict.fromkeys(labels + pred_labels))
    cm = confusion_matrix(y, p, labels=all_labels)
    rows = [all_labels.index(x) for x in labels]
    cols = [all_labels.index(x) for x in pred_labels]
    cm = cm[np.ix_(rows, cols)]
    norm = cm / np.maximum(cm.sum(axis=1, keepdims=True), 1)
    size = max(4.5, 0.55 * max(len(labels), len(pred_labels)) + 2)
    fig, ax = plt.subplots(figsize=(size, size * 0.9))
    ax.imshow(norm, cmap="Greens", vmin=0, vmax=1)
    ax.set_xticks(range(len(pred_labels)), pred_labels, rotation=45, ha="right")
    ax.set_yticks(range(len(labels)), labels)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title(title)
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            if cm[i, j]:
                ax.text(j, i, str(cm[i, j]), ha="center", va="center", fontsize=8,
                        color="white" if norm[i, j] > 0.55 else "#1B1F1A")
    fig.tight_layout()
    fig.savefig(os.path.join(d, filename), dpi=150)
    plt.close(fig)
    return cm.tolist()


def r3(x):
    return round(float(x), 4)


# ---------- species + unknown-animal gate ----------

def group_of(path, root):
    """Sub-folder name, or the folder itself when the photo sits directly in it."""
    rel = os.path.relpath(path, root).replace("\\", "/")
    return rel.split("/")[0] if "/" in rel else os.path.basename(root.rstrip("/\\"))


def species_label(path, root):
    rel = os.path.relpath(path, root).replace("\\", "/").lower()
    first = rel.split("/")[0] if "/" in rel else os.path.basename(root.rstrip("/\\")).lower()
    return "buffalo" if first in BUFFALO_BREEDS or "buffalo" in first or "buffalo" in root.lower() else "cow"


def run_species(args):
    reg = ModelRegistry(load_config()).load_all(only=["gate", "species"])
    gate, species = reg.get("gate"), reg.get("species")
    timer = Timer()
    rows = []
    sources = [(d, None) for d in args.cattle] + [(d, "unknown") for d in args.not_cattle]
    for root, fixed in sources:
        for path in images_in(root):
            img = load(path)
            if img is None:
                continue
            y = fixed or species_label(path, root)
            g = timer(gate.predict, img)
            s = species.predict(img, g)
            rows.append({"y": y, "p": s["species"], "gate_score": g["cattle_score"],
                         "species_score": max(s["species_model"].values()), "source": os.path.basename(root.rstrip("/\\")),
                         "group": group_of(path, root) if fixed else ""})
    d = outdir("species")
    labels = ["cow", "buffalo", "unknown"]
    y, p = [r["y"] for r in rows], [r["p"] for r in rows]
    rep = save_report(d, y, p, labels)
    cm = plot_confusion(d, y, p, labels, "Species step (cattle gate + cow/buffalo)")

    cattle = [r for r in rows if r["y"] != "unknown"]
    neg = [r for r in rows if r["y"] == "unknown"]
    accepted = [r for r in cattle if r["p"] != "unknown"]
    cb_acc = np.mean([r["p"] == r["y"] for r in accepted]) if accepted else 0

    # Unknown-animal threshold study: false accept (not cattle passed) vs false reject (cattle stopped)
    th_rows = []
    for key, ths in (("gate_score", (0.005, 0.01, 0.02, 0.03, 0.05, 0.1, 0.2, 0.3, 0.5)),
                     ("species_score", (0.6, 0.7, 0.8, 0.9, 0.95, 0.99))):
        for t in ths:
            th_rows.append({"score": key, "threshold": t,
                            "false_accept": r3(np.mean([r[key] >= t for r in neg])) if neg else None,
                            "false_reject": r3(np.mean([r[key] < t for r in cattle])) if cattle else None})
    with open(os.path.join(d, "threshold_study.csv"), "w", newline="", encoding="utf8") as f:
        w = csv.DictWriter(f, fieldnames=["score", "threshold", "false_accept", "false_reject"])
        w.writeheader()
        w.writerows(th_rows)
    fig, ax = plt.subplots(figsize=(6, 4))
    g_rows = [r for r in th_rows if r["score"] == "gate_score"]
    xs = [r["threshold"] for r in g_rows]
    ax.plot(xs, [100 * r["false_accept"] for r in g_rows], "o-", color="#C0262D", label="Not cattle accepted (false accept)")
    ax.plot(xs, [100 * r["false_reject"] for r in g_rows], "s-", color="#1F5F3A", label="Cattle rejected (false reject)")
    ax.axvline(load_config()["gate"]["cattle_threshold"], color="#E8A317", ls="--", label="Threshold used")
    # The app's real decision also turns away sheep (ram/bighorn stronger than the cattle score)
    th_used = load_config()["gate"]["cattle_threshold"]
    ax.scatter([th_used], [100 * np.mean([r["p"] != "unknown" for r in neg])], marker="*", s=160, color="#C0262D",
               zorder=5, label="Not cattle accepted, with sheep rule (app)")
    ax.scatter([th_used], [100 * np.mean([r["p"] == "unknown" for r in cattle])], marker="*", s=160, color="#1F5F3A",
               zorder=5, label="Cattle rejected, with sheep rule (app)")
    ax.set_xscale("log")
    ax.set_xlabel("Cattle-gate threshold (P(ox + water buffalo + oxcart))")
    ax.set_ylabel("%")
    ax.set_title("Unknown-animal threshold study")
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(os.path.join(d, "threshold_study.png"), dpi=150)
    plt.close(fig)

    per_neg = defaultdict(lambda: [0, 0])
    for r in neg:
        per_neg[r["group"] or r["source"]][0] += r["p"] != "unknown"
        per_neg[r["group"] or r["source"]][1] += 1
    per_src = defaultdict(lambda: [0, 0])
    for r in cattle:
        per_src[r["source"]][0] += r["p"] == r["y"]
        per_src[r["source"]][1] += 1

    data = {
        "model": "cattle gate (ImageNet EfficientNetV2-B0) + cow/buffalo decision",
        "version": {"gate": gate.version, "species": species.version},
        "threshold": load_config()["gate"]["cattle_threshold"],
        "n": {"cattle": len(cattle), "buffalo": sum(r["y"] == "buffalo" for r in cattle), "not_cattle": len(neg)},
        "accuracy_3class": r3(np.mean([a == b for a, b in zip(y, p)])),
        "macro_f1": r3(rep["macro avg"]["f1-score"]),
        "cattle_accepted": r3(len(accepted) / max(len(cattle), 1)),
        "not_cattle_rejected": r3(np.mean([r["p"] == "unknown" for r in neg])) if neg else None,
        "cow_vs_buffalo_accuracy_on_accepted": r3(cb_acc),
        "per_class": {k: {m: r3(rep[k][m]) for m in ("precision", "recall", "f1-score")} for k in labels},
        "not_cattle_accepted_by_group": {k: f"{v[0]}/{v[1]}" for k, v in sorted(per_neg.items())},
        "cattle_correct_by_source": {k: f"{v[0]}/{v[1]}" for k, v in sorted(per_src.items())},
        "confusion_matrix": {"labels": labels, "matrix": cm},
        "timing_cpu": {"gate_per_photo": timer.summary()},
    }
    save_json(d, data)
    print(json.dumps({k: v for k, v in data.items() if k not in ("confusion_matrix",)}, indent=1))


# ---------- breed ----------

def run_breed(args):
    cfg = load_config()
    reg = ModelRegistry(cfg).load_all(only=["gate", "species", "breed"])
    gate, species, breed = reg.get("gate"), reg.get("species"), reg.get("breed")
    labels = list(breed.labels)
    plain = breed.__class__({**cfg["breed"], "tta": ["center"]}, BASE_DIR)
    t_app, t_plain = Timer(), Timer()
    rows = []
    for sub in sorted(os.listdir(args.test)):
        if sub not in labels:
            continue
        for path in images_in(os.path.join(args.test, sub)):
            img = load(path)
            if img is None:
                continue
            s = species.predict(img, gate.predict(img))
            sp = s["species"]
            app = t_app(breed.predict, [img], sp if sp != "unknown" else None, s["confidence"] if sp != "unknown" else None)
            base = t_plain(plain.predict, [img], None)
            rows.append({"y": sub, "p": app["breed_key"], "p_plain": base["breed_key"], "uncertain": app["uncertain"],
                         "top3": [x["breed_key"] for x in app["top3"]], "species": sp, "conf": app["confidence"],
                         "conflict": app["species_conflict"]})
    d = outdir("breed")
    y = [r["y"] for r in rows]
    p = [r["p"] for r in rows]
    pp = [r["p_plain"] for r in rows]
    rep = save_report(d, y, p, labels)
    rep_plain = save_report(d, y, pp, labels, "classification_report_model_only.csv")
    cm = plot_confusion(d, y, p, labels, "Breed (app settings: 4 views + species filter)")
    plot_confusion(d, y, pp, labels, "Breed (model only, centre crop)", "confusion_matrix_model_only.png")
    conf = [r for r in rows if not r["uncertain"]]
    data = {
        "model": "ResNet-18 (15 breeds)",
        "version": breed.version,
        "test_set": "team's held-out test split (cluster-aware, no leakage per DATASET_SOURCE.md)",
        "n": len(rows),
        "app_settings": {
            "accuracy": r3(np.mean([a == b for a, b in zip(y, p)])),
            "top3_accuracy": r3(np.mean([r["y"] in r["top3"] for r in rows])),
            "macro_precision": r3(rep["macro avg"]["precision"]),
            "macro_recall": r3(rep["macro avg"]["recall"]),
            "macro_f1": r3(rep["macro avg"]["f1-score"]),
            "uncertain_rate": r3(np.mean([r["uncertain"] for r in rows])),
            "accuracy_when_not_uncertain": r3(np.mean([r["y"] == r["p"] for r in conf])) if conf else None,
            "species_conflict_rate": r3(np.mean([r["conflict"] for r in rows])),
        },
        "model_only_centre_crop": {
            "accuracy": r3(np.mean([a == b for a, b in zip(y, pp)])),
            "macro_f1": r3(rep_plain["macro avg"]["f1-score"]),
        },
        "species_step_on_this_set": dict(Counter(r["species"] for r in rows)),
        "per_class_f1": {k: r3(rep[k]["f1-score"]) for k in labels},
        "confusion_matrix": {"labels": labels, "matrix": cm},
        "timing_cpu": {"app_settings_per_photo": t_app.summary(), "model_only_per_photo": t_plain.summary()},
    }
    save_json(d, data)
    print(json.dumps({k: v for k, v in data.items() if k not in ("confusion_matrix", "per_class_f1")}, indent=1))


# ---------- age ----------

def run_age(args):
    from eval_age import group4

    project = args.project
    data_dir = os.path.join(project, "Dataset", "Dataset")
    split = {r["image_id"]: r for r in csv.DictReader(open(os.path.join(project, "data", "splits", "folds.csv")))}
    manifest = [r for r in csv.DictReader(open(os.path.join(project, "data", "manifest.csv")))
                if split[r["image_id"]]["fold"] == "-1"]
    model = ModelRegistry(load_config()).load_all(only=["age"]).get("age")
    timer = Timer()
    rows = []
    for r in manifest:
        img = load(os.path.join(data_dir, r["raw_path"]))
        if img is None:
            continue
        out = timer(model.predict, to_array(img), enforce_quality=False)
        rows.append({"y": int(r["age"]), "p": int(out["age_years"]), "uncertain": out["uncertain"], "ok": out["quality"]["ok"]})
    d = outdir("age")
    y = np.array([r["y"] for r in rows])
    p = np.array([r["p"] for r in rows])
    unc = np.array([r["uncertain"] for r in rows])
    ok = np.array([r["ok"] for r in rows])
    labels = sorted(set(y.tolist()) | set(p.tolist()))
    rep = save_report(d, [str(a) for a in y], [str(a) for a in p], [str(a) for a in labels])
    cm = plot_confusion(d, [str(a) for a in y], [str(a) for a in p], [str(a) for a in labels], "Age in years (5-fold ensemble + TTA)")

    def block(mask):
        if not mask.any():
            return None
        yy, pp = y[mask], p[mask]
        return {"n": int(mask.sum()), "exact": r3(np.mean(yy == pp)), "within_1_year": r3(np.mean(np.abs(yy - pp) <= 1)),
                "mae_years": r3(np.mean(np.abs(yy - pp))),
                "age_group_accuracy": r3(np.mean([group4(a) == group4(b) for a, b in zip(yy, pp)]))}

    data = {
        "model": "MobileNetV3 age model, 5-fold ensemble (ONNX) + incisor segmenter",
        "version": model.version,
        "test_set": "age project's holdout split (fold -1, never used in training)",
        "all_photos": block(np.ones(len(rows), bool)),
        "not_flagged_uncertain": block(~unc),
        "passed_photo_quality_gate": block(ok),
        "flagged_uncertain_rate": r3(unc.mean()),
        "macro_f1_per_year": r3(rep["macro avg"]["f1-score"]),
        "age_groups": "1-4 / 5-8 / 9-12 / 13+ years",
        "confusion_matrix": {"labels": labels, "matrix": cm},
        "timing_cpu": {"per_photo": timer.summary()},
    }
    save_json(d, data)
    print(json.dumps({k: v for k, v in data.items() if k != "confusion_matrix"}, indent=1))


# ---------- health ----------

def run_health(args):
    from eval_health import CLASSES, label_of

    reg = ModelRegistry(load_config()).load_all(only=["health"])
    model = reg.get("health")
    timer = Timer()
    rows = []
    for root in args.sets:
        src = os.path.basename(root.rstrip("/\\"))
        for path in images_in(root):
            y = label_of(path)
            img = load(path) if y else None
            if img is None:
                continue
            r = timer(model.predict, [img])
            probs = r["per_image"][0]["probabilities"]
            rows.append({"y": y, "top": max(CLASSES, key=lambda c: probs[c]), "cond": r["condition"], "src": src})
    d = outdir("health")
    y = [r["y"] for r in rows]
    top = [r["top"] for r in rows]
    cond = [r["cond"] for r in rows]
    rep = save_report(d, y, top, CLASSES)
    cm = plot_confusion(d, y, top, CLASSES, "Health (top-1 class)")
    cm_app = plot_confusion(d, y, cond, CLASSES, "Health (app decision, with 'uncertain')", "confusion_matrix_app.png",
                            pred_labels=CLASSES + ["uncertain"])
    sick = [i for i, a in enumerate(y) if a != "healthy"]
    healthy = [i for i, a in enumerate(y) if a == "healthy"]
    per_src = {}
    for s in sorted({r["src"] for r in rows}):
        idx = [i for i, r in enumerate(rows) if r["src"] == s]
        per_src[s] = {"n": len(idx), "top1": r3(np.mean([y[i] == top[i] for i in idx])), "labels": dict(Counter(y[i] for i in idx))}
    data = {
        "model": "EfficientNet-B3 (xprotocol/EfficientNet-B3-Cattle-Disease)",
        "version": model.version,
        "test_sets": "5 public GitHub sets (may overlap the model's training data; reported per source)",
        "n": len(rows),
        "labels": dict(Counter(y)),
        "top1_accuracy": r3(np.mean([a == b for a, b in zip(y, top)])),
        "macro_precision": r3(rep["macro avg"]["precision"]),
        "macro_recall": r3(rep["macro avg"]["recall"]),
        "macro_f1": r3(rep["macro avg"]["f1-score"]),
        "app_decision": {
            "sick_called_healthy": r3(np.mean([cond[i] == "healthy" for i in sick])) if sick else None,
            "healthy_called_sick": r3(np.mean([cond[i] in ("foot-and-mouth", "lumpy") for i in healthy])) if healthy else None,
            "uncertain_rate": r3(np.mean([c == "uncertain" for c in cond])),
        },
        "per_class": {k: {m: r3(rep[k][m]) for m in ("precision", "recall", "f1-score", "support")} for k in CLASSES},
        "per_source": per_src,
        "confusion_matrix": {"labels": CLASSES, "matrix": cm},
        "confusion_matrix_app": {"rows": CLASSES, "cols": CLASSES + ["uncertain"], "matrix": cm_app},
        "timing_cpu": {"per_photo": timer.summary()},
    }
    if args.teeth:
        # Why the teeth photo is left out of the health check (Module 7): healthy mouths on a disease model
        project = args.teeth
        data_dir = os.path.join(project, "Dataset", "Dataset")
        split = {r["image_id"]: r for r in csv.DictReader(open(os.path.join(project, "data", "splits", "folds.csv")))}
        manifest = [r for r in csv.DictReader(open(os.path.join(project, "data", "manifest.csv")))
                    if split[r["image_id"]]["fold"] == "-1"]
        teeth = Counter()
        for r in manifest:
            img = load(os.path.join(data_dir, r["raw_path"]))
            if img is not None:
                teeth[model.predict([img])["condition"]] += 1
        data["teeth_photos_of_healthy_animals"] = {"n": sum(teeth.values()), "result": dict(teeth),
                                                   "note": "teeth close-ups are out of distribution; the app sends only the 4 body photos"}
    save_json(d, data)
    print(json.dumps({k: v for k, v in data.items() if not k.startswith("confusion")}, indent=1))


# ---------- summary ----------

def pct(x):
    return "—" if x is None else f"{100 * x:.1f} %"


def run_summary(_args):
    def read(name):
        p = os.path.join(OUT, name, "metrics.json")
        return json.load(open(p, encoding="utf8")) if os.path.exists(p) else None

    sp, br, ag, he = read("species"), read("breed"), read("age"), read("health")
    lines = ["# Model results", "",
             "Generated by `ml-service/eval/evaluate.py` (run `python eval/evaluate.py summary` to rebuild this page).",
             "All numbers are measured on photos the models were not trained on, with the same code and settings the app uses. "
             "Times are on this project's development laptop CPU (no GPU).", ""]
    lines += ["| Model | Test data | Main result | Other measures | CPU time / photo |", "|---|---|---|---|---|"]
    if sp:
        lines.append(f"| Species + unknown-animal gate | {sp['n']['cattle']} cattle ({sp['n']['buffalo']} buffalo) + {sp['n']['not_cattle']} not-cattle | "
                     f"cow vs buffalo {pct(sp['cow_vs_buffalo_accuracy_on_accepted'])} | cattle accepted {pct(sp['cattle_accepted'])}, "
                     f"not-cattle rejected {pct(sp['not_cattle_rejected'])}, 3-class macro-F1 {sp['macro_f1']:.3f} | "
                     f"{sp['timing_cpu']['gate_per_photo']['mean_ms']:.0f} ms |")
    if br:
        a = br["app_settings"]
        lines.append(f"| Breed (15 classes) | {br['n']} photos, team's held-out test split | accuracy {pct(a['accuracy'])}, macro-F1 {a['macro_f1']:.3f} | "
                     f"top-3 {pct(a['top3_accuracy'])}; {pct(a['uncertain_rate'])} marked uncertain, {pct(a['accuracy_when_not_uncertain'])} correct otherwise; "
                     f"model alone {pct(br['model_only_centre_crop']['accuracy'])} | {br['timing_cpu']['app_settings_per_photo']['mean_ms']:.0f} ms |")
    if ag:
        a, c = ag["all_photos"], ag["not_flagged_uncertain"]
        lines.append(f"| Age (from teeth) | {a['n']} holdout photos | within ±1 year {pct(a['within_1_year'])}, MAE {a['mae_years']:.2f} y | "
                     f"exact {pct(a['exact'])}, age group {pct(a['age_group_accuracy'])}; when not flagged uncertain ({c['n']}): ±1 y {pct(c['within_1_year'])}, MAE {c['mae_years']:.2f} y | "
                     f"{ag['timing_cpu']['per_photo']['mean_ms']:.0f} ms |")
    if he:
        a = he["app_decision"]
        lines.append(f"| Health (FMD / lumpy skin) | {he['n']} photos, 5 public sets | top-1 {pct(he['top1_accuracy'])}, macro-F1 {he['macro_f1']:.3f} | "
                     f"sick called healthy {pct(a['sick_called_healthy'])}, healthy called sick {pct(a['healthy_called_sick'])}, uncertain {pct(a['uncertain_rate'])} | "
                     f"{he['timing_cpu']['per_photo']['mean_ms']:.0f} ms |")
    lines += ["", "Per model: `metrics.json` (all numbers), `classification_report.csv` (precision / recall / F1 per class), "
              "`confusion_matrix.png`. Species also has `threshold_study.csv/.png`.", ""]
    if sp:
        lines += ["## Unknown-animal threshold study", "", "| Gate threshold | Not-cattle accepted | Cattle rejected |", "|---|---|---|"]
        for r in csv.DictReader(open(os.path.join(OUT, "species", "threshold_study.csv"), encoding="utf8")):
            if r["score"] == "gate_score":
                mark = " (threshold used, gate score alone)" if float(r["threshold"]) == sp["threshold"] else ""
                lines.append(f"| {r['threshold']}{mark} | {pct(float(r['false_accept']))} | {pct(float(r['false_reject']))} |")
        lines.append(f"| {sp['threshold']} + sheep rule (what the app does) | {pct(1 - sp['not_cattle_rejected'])} | {pct(1 - sp['cattle_accepted'])} |")
        lines += ["", "The sheep rule turns a photo away when ImageNet's ram + bighorn score is higher than its cattle score.", ""]
        lines += ["", "The species model's own score cannot separate cattle from other animals:", "",
                  "| Species-model threshold | Not-cattle accepted | Cattle rejected |", "|---|---|---|"]
        for r in csv.DictReader(open(os.path.join(OUT, "species", "threshold_study.csv"), encoding="utf8")):
            if r["score"] == "species_score":
                lines.append(f"| {r['threshold']} | {pct(float(r['false_accept']))} | {pct(float(r['false_reject']))} |")
        lines += ["", f"Not-cattle accepted at the threshold used, by kind: {sp['not_cattle_accepted_by_group']}", ""]
    timing = os.path.join(OUT, "end_to_end.json")
    if os.path.exists(timing):
        t = json.load(open(timing, encoding="utf8"))
        lines += ["## End-to-end time", "", t["summary_md"], ""]
    lines += [
        "## Changes made from these measurements (Module 9)", "",
        "Tuned only on separate data (the breed project's validation split and Animals-10 photos not used in the tests above), "
        "then measured once on the test sets.", "",
        "- **Sheep rule in the cattle gate**: sheep accepted as cattle 25/60 → 8/60; all not-cattle rejected 89.6 % → 94.1 %; "
        "cattle accepted 94.8 % → 94.5 %.",
        "- **Breed: species filter only when the species step is at least 75 % sure.** Always filtering cost accuracy because the "
        "species step is wrong more often than the breed model on this set. Breed accuracy 64.9 % → 70.6 %, macro-F1 0.637 → 0.713, "
        "top-3 85.7 % → 92.9 %. When a breed of the other species wins, it is marked uncertain (shown as \"possibly …\").",
        "- **Teeth photo not used for health** (Module 7): on the 449 holdout teeth photos of healthy animals the disease model said "
        "foot-and-mouth for 42 % of them.", "",
        "## Data and caveats", "",
        "- **Breed / species**: the team's 15-breed dataset, held-out *test* split (cluster-aware, no leakage per its DATASET_SOURCE.md). "
        "Cow:buffalo is 12:1 here, which is why buffalo precision looks low; Pakistani mandis have far more buffaloes. "
        "On genuinely different photos (Hugging Face `SynthAIzer/indian-cattle-buffalo-breeds`) breed accuracy is much lower "
        "(about 20–25 % on breeds the model knows): the LLM breed check from a side photo is the main safeguard.",
        "- **Not-cattle**: Animals-10 (Hugging Face `Rapidata/Animals-10`: cat, chicken, dog, elephant, horse, sheep) + 37 Wikimedia "
        "Commons photos. Horses are the hardest case (11/60 accepted): brown cattle share ImageNet's \"sorrel\" class.",
        "- **Age**: the age project's holdout fold (never used for training).",
        "- **Health**: five public GitHub sets (`11Adars`, `tleeds1`, `Abdo965`, `SuryaGudipati21`, `shubh-07-lk`). They may overlap the "
        "Hugging Face model's training data, so these numbers are likely optimistic; real mandi photos are needed (field test).",
        "- No GPU; times are single-photo calls after warm-up.", "",
    ]
    with open(os.path.join(OUT, "README.md"), "w", encoding="utf8") as f:
        f.write("\n".join(lines))
    print("\n".join(lines))


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # the Windows console defaults to cp1252
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("species")
    s.add_argument("--cattle", nargs="+", required=True)
    s.add_argument("--not-cattle", nargs="+", required=True)
    s = sub.add_parser("breed")
    s.add_argument("--test", required=True)
    s = sub.add_parser("age")
    s.add_argument("--project", required=True)
    s = sub.add_parser("health")
    s.add_argument("--sets", nargs="+", required=True)
    s.add_argument("--teeth")
    sub.add_parser("summary")
    args = ap.parse_args()
    {"species": run_species, "breed": run_breed, "age": run_age, "health": run_health, "summary": run_summary}[args.cmd](args)


if __name__ == "__main__":
    main()
