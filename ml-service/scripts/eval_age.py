"""Evaluate the age pipeline end to end (segmenter -> crop -> model) on the age project's holdout split.

Usage: python scripts/eval_age.py "F:/FYP/Models/Age Detection"
Compares the single-fold export with the 5-fold ensemble, with and without test-time views.
The holdout images were never used for training; the dataset itself stays outside this repo (licence).
"""
import copy
import csv
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np  # noqa: E402

from maweshi_ml.age.pipeline import AgeModel  # noqa: E402
from maweshi_ml.imaging import decode_image, to_array  # noqa: E402
from maweshi_ml.registry import BASE_DIR, load_config  # noqa: E402


def group4(a: int) -> int:
    return 1 if a <= 4 else 2 if a <= 8 else 3 if a <= 12 else 4


def metrics(y, p, uncertain=None) -> str:
    y, p = np.array(y), np.array(p)
    out = (f"n={len(y)} exact={np.mean(y == p):.3f} group4={np.mean([group4(a) == group4(b) for a, b in zip(y, p)]):.3f} "
           f"MAE={np.mean(np.abs(y - p)):.2f} within1={np.mean(np.abs(y - p) <= 1):.3f}")
    if uncertain is not None:
        u = np.array(uncertain, bool)
        if (~u).any():
            out += f" | confident only: n={(~u).sum()} MAE={np.mean(np.abs(y[~u] - p[~u])):.2f} within1={np.mean(np.abs(y[~u] - p[~u]) <= 1):.3f}"
    return out


def main():
    project = sys.argv[1]
    data = os.path.join(project, "Dataset", "Dataset")
    split = {r["image_id"]: r for r in csv.DictReader(open(os.path.join(project, "data", "splits", "folds.csv")))}
    manifest = [r for r in csv.DictReader(open(os.path.join(project, "data", "manifest.csv"))) if split[r["image_id"]]["fold"] == "-1"]
    print(f"holdout images: {len(manifest)}")
    images = [(int(r["age"]), to_array(decode_image(open(os.path.join(data, r["raw_path"]), "rb").read()))) for r in manifest]

    base = load_config()["age"]
    variants = {
        "fold0 (old export)": {**base, "onnx": "age.onnx", "tta_flip": False, "tta_scales": [1.0]},
        "5-fold ensemble": {**base, "tta_flip": False, "tta_scales": [1.0]},
        "5-fold ensemble + TTA": base,
    }
    for name, cfg in variants.items():
        model = AgeModel(copy.deepcopy(cfg), BASE_DIR)
        t = time.perf_counter()
        results = [model.predict(rgb, enforce_quality=False) for _, rgb in images]
        ms = (time.perf_counter() - t) / len(images) * 1000
        y = [a for a, _ in images]
        p = [r["age_years"] for r in results]
        passed = [r["quality"]["ok"] for r in results]
        print(f"\n{name}  ({ms:.0f} ms/photo)")
        print("  all photos:        ", metrics(y, p, [r["uncertain"] for r in results]))
        yq = [a for a, ok in zip(y, passed) if ok]
        pq = [b for b, ok in zip(p, passed) if ok]
        print(f"  passed photo gate ({len(yq)}/{len(y)}):", metrics(yq, pq))


if __name__ == "__main__":
    main()
