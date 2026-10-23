"""Compare breed-model inference settings on labelled folders.

Usage: python scripts/eval_breed.py <folder> [<folder> ...]
Each folder holds one sub-folder per breed, named like the Hugging Face sets ("Cattle_Sahiwal",
"Buffalo_NILI_RAVI", "Holstein Friesian cattle", "Jersey cattle", "Brown_Swiss"). Breeds the model doesn't
know are scored as "out of class": there the model should say `uncertain`.
"""
import copy
import os
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np  # noqa: E402

from maweshi_ml.breed import BreedModel  # noqa: E402
from maweshi_ml.imaging import decode_image  # noqa: E402
from maweshi_ml.registry import BASE_DIR, load_config  # noqa: E402

BUFFALO_BREEDS = {"banni", "bargur-buffalo", "bhadawari", "chhattisgarhi", "chilika", "gojri", "jaffarabadi",
                  "kalahandi", "luitswamp", "marathwadi", "mehsana", "murrah", "nagpuri", "nili-ravi",
                  "pandharpuri", "surti", "toda"}


def label_of(folder: str) -> tuple[str, str]:
    """(breed key in labels.json style, species)."""
    name = folder.lower().replace(" cattle", "")
    species = "buffalo" if name.startswith("buffalo_") else "cow"
    name = re.sub(r"^(buffalo|cattle)_", "", name).replace("_", "-").replace(" ", "-")
    name = {"jaffrabadi": "jaffarabadi"}.get(name, name)
    if name == "banni":
        species = "buffalo"
    return name, species


def load(folders):
    items = []
    for root in folders:
        for sub in sorted(os.listdir(root)):
            d = os.path.join(root, sub)
            if not os.path.isdir(d):
                continue
            breed, species = label_of(sub)
            for f in sorted(os.listdir(d)):
                if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    with open(os.path.join(d, f), "rb") as fh:
                        items.append((breed, species, decode_image(fh.read())))
    return items


def main():
    items = load(sys.argv[1:])
    base = load_config()["breed"]
    known = set(BreedModel(base, BASE_DIR).labels)
    print(f"{len(items)} images; in-class {sum(b in known for b, _, _ in items)}, "
          f"out-of-class {sum(b not in known for b, _, _ in items)}")

    variants = {
        "center (export)": ["center"],
        "center + flip": ["center", "center_flip"],
        "full + flip": ["full", "full_flip"],
        "center + full + flips": ["center", "center_flip", "full", "full_flip"],
    }
    for name, views in variants.items():
        model = BreedModel({**copy.deepcopy(base), "tta": views}, BASE_DIR)
        for gate in (False, True):
            hits1 = hits3 = n_in = unc_in = unc_out = n_out = 0
            per = defaultdict(lambda: [0, 0])
            for breed, species, image in items:
                r = model.predict([image], species if gate else None)
                keys = [t["breed_key"] for t in r["top3"]]
                if breed in known:
                    n_in += 1
                    hits1 += keys[0] == breed
                    hits3 += breed in keys
                    unc_in += r["uncertain"]
                    per[breed][0] += keys[0] == breed
                    per[breed][1] += 1
                else:
                    n_out += 1
                    unc_out += r["uncertain"]
            print(f"{name:24s} gate={'on ' if gate else 'off'} top1={hits1 / n_in:.3f} top3={hits3 / n_in:.3f} "
                  f"uncertain: in-class {unc_in / n_in:.2f}, out-of-class {unc_out / max(n_out, 1):.2f}")
        if name == "center + full + flips":
            print("  per breed (gate on):", {k: f"{v[0]}/{v[1]}" for k, v in sorted(per.items())})


if __name__ == "__main__":
    main()
