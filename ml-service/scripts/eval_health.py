"""Evaluate the health model on labelled disease photos.

Usage: python scripts/eval_health.py <root> [<root> ...]
Labels come from folder or file names: FMD / foot and mouth / diseased-foot -> foot-and-mouth,
LSD / lumpy -> lumpy, healthy / normal / non-diseased -> healthy. Unlabelled files are skipped.
Reports results per source, because public sets may overlap the model's training data.
"""
import copy
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np  # noqa: E402

from maweshi_ml.health import HealthModel  # noqa: E402
from maweshi_ml.imaging import InvalidImage, decode_image  # noqa: E402
from maweshi_ml.registry import BASE_DIR, load_config  # noqa: E402

CLASSES = ["foot-and-mouth", "healthy", "lumpy"]


def label_of(path: str):
    s = path.lower().replace("\\", "/")
    name = s.rsplit("/", 1)[-1]
    if "non-diseased" in name or "healthy" in s or "/normal" in s or "normal skin" in s:
        return "healthy"
    if "lumpy" in s or "/lsd" in s:
        return "lumpy"
    if "foot and mouth" in s or "/fmd" in s or name.startswith("fmd") or "diseased-foot" in name or "foot-and-mougth" in name or "hoof_mouth" in name:
        return "foot-and-mouth"
    return None


def main():
    base = load_config()["health"]
    variants = {"single view": {**base, "tta_flip": False}, "+ flip": {**base, "tta_flip": True}}
    models = {k: HealthModel(copy.deepcopy(v), BASE_DIR) for k, v in variants.items()}
    for root in sys.argv[1:]:
        items = []
        for d, _, files in os.walk(root):
            for f in sorted(files):
                path = os.path.join(d, f)
                y = label_of(path)
                if y and f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    try:
                        items.append((y, decode_image(open(path, "rb").read())))
                    except InvalidImage:
                        pass
        if not items:
            continue
        print(f"\n== {os.path.basename(root.rstrip('/'))}: {dict(Counter(y for y, _ in items))}")
        for name, model in models.items():
            res = [model.predict([img]) for _, img in items]
            y = [lab for lab, _ in items]
            top = [CLASSES[int(np.argmax([r["per_image"][0]["probabilities"][c] for c in CLASSES]))] for r in res]
            cond = [r["condition"] for r in res]
            acc = np.mean([a == b for a, b in zip(y, top)])
            sick = [i for i, lab in enumerate(y) if lab != "healthy"]
            healthy = [i for i, lab in enumerate(y) if lab == "healthy"]
            missed = np.mean([cond[i] == "healthy" for i in sick]) if sick else float("nan")
            false_alarm = np.mean([cond[i] in ("foot-and-mouth", "lumpy") for i in healthy]) if healthy else float("nan")
            unc = np.mean([c == "uncertain" for c in cond])
            per = {c: f"{sum(1 for a, b in zip(y, top) if a == c and b == c)}/{y.count(c)}" for c in CLASSES if c in y}
            print(f"  {name:12s} top1={acc:.3f} per-class={per} | sick called healthy={missed:.2f} "
                  f"healthy called sick={false_alarm:.2f} uncertain={unc:.2f}")


if __name__ == "__main__":
    main()
