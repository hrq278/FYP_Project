"""Cattle gate: a standard ImageNet classifier decides whether the photo shows cattle at all.

Our species model only knows cow vs buffalo, so it scores goats, cats and even grass as "cow" with
0.95+ confidence. ImageNet's 1,000 classes include ox, water buffalo and oxcart alongside goats, sheep,
dogs, camels and vehicles, which makes it a much better "is this cattle?" check (see PROGRESS.md, Module 1).
"""

from __future__ import annotations

import json
import os

import keras
import numpy as np
from PIL import Image


class CattleGate:
    def __init__(self, cfg: dict, base_dir: str):
        self.cfg = cfg
        self.version = cfg["version"]
        with open(os.path.join(base_dir, cfg["class_index"]), encoding="utf-8") as f:
            index = {v[1]: int(k) for k, v in json.load(f).items()}
        self.cow_idx = [index[n] for n in cfg["cow_classes"]]
        self.buffalo_idx = [index[n] for n in cfg["buffalo_classes"]]
        self.context_idx = [index[n] for n in cfg.get("context_classes", [])]
        self.names = {i: n for n, i in index.items()}
        # EfficientNetV2 includes its own rescaling: feed RGB 0-255
        self.model = keras.applications.EfficientNetV2B0(weights=os.path.join(base_dir, cfg["path"]))

    def predict(self, image: Image.Image) -> dict:
        size = self.cfg["input_size"]
        x = np.asarray(image.resize((size, size), Image.Resampling.BILINEAR), dtype=np.float32)[None]
        p = np.asarray(self.model(x, training=False))[0]
        cow, buffalo = float(p[self.cow_idx].sum()), float(p[self.buffalo_idx].sum())
        score = cow + buffalo + float(p[self.context_idx].sum())
        return {
            "is_cattle": score >= self.cfg["cattle_threshold"],
            "cattle_score": round(score, 4),
            # Share of the cattle evidence that looks like buffalo (None when there is none)
            "buffalo_share": round(buffalo / (cow + buffalo), 4) if cow + buffalo > 1e-6 else None,
            "top3": [{"label": self.names[i], "p": round(float(p[i]), 4)} for i in p.argsort()[::-1][:3]],
            "model_version": self.version,
        }
