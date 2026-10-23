"""Unknown-animal study for the species step (cattle gate + species model).

Usage: python scripts/threshold_study.py <cattle_dir> <not_cattle_dir> [more not_cattle dirs...]
Prints, per image, the species model's top score and the gate's cattle score, then false-accept /
false-reject tables for both, and the final species decision.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import numpy as np  # noqa: E402

from maweshi_ml.imaging import decode_image  # noqa: E402
from maweshi_ml.registry import ModelRegistry, load_config  # noqa: E402

EXT = (".jpg", ".jpeg", ".png", ".webp")


def scores(registry, folder):
    species, gate = registry.get("species"), registry.get("gate")
    out = []
    for name in sorted(os.listdir(folder)):
        if name.lower().endswith(EXT):
            with open(os.path.join(folder, name), "rb") as f:
                image = decode_image(f.read())
            p = species.probabilities(image)
            g = gate.predict(image)
            final = species.predict(image, g)
            out.append({"name": name, "species_score": float(p.max()), "gate_score": g["cattle_score"],
                        "final": final["species"], "top": g["top3"][0]["label"]})
    return out


def table(title, key, thresholds, pos, neg):
    print(f"\n{title}\n  threshold  false_accept(not-cattle passed)  false_reject(cattle rejected)")
    for t in thresholds:
        fa = np.mean([r[key] >= t for r in neg]) if neg else 0
        fr = np.mean([r[key] < t for r in pos]) if pos else 0
        print(f"  {t:.2f}       {fa:6.1%}                           {fr:6.1%}")


def main():
    registry = ModelRegistry(load_config()).load_all(only=["gate", "species"])
    pos = scores(registry, sys.argv[1])
    neg = [s for d in sys.argv[2:] for s in scores(registry, d)]
    for label, rows in (("CATTLE", pos), ("NOT CATTLE", neg)):
        print(f"\n{label} ({len(rows)})  species_score gate_score final    gate_top1")
        for r in sorted(rows, key=lambda r: r["gate_score"]):
            print(f"  {r['species_score']:.4f}  {r['gate_score']:.4f}  {r['final']:8s} {r['top']:16s} {r['name']}")
    table("Species model score alone", "species_score", (0.6, 0.7, 0.8, 0.9, 0.95, 0.99), pos, neg)
    table("Gate score (ox + water buffalo + oxcart)", "gate_score", (0.02, 0.05, 0.1, 0.2, 0.3), pos, neg)
    print(f"\nFinal decision: {sum(r['final'] == 'unknown' for r in neg)}/{len(neg)} not-cattle rejected, "
          f"{sum(r['final'] != 'unknown' for r in pos)}/{len(pos)} cattle accepted")


if __name__ == "__main__":
    main()
