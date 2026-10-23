"""Health model: EfficientNet-B3 baseline (foot-and-mouth / healthy / lumpy skin)."""

from __future__ import annotations

import os

import keras
import numpy as np
from PIL import Image


class EfficientNetPreprocess(keras.layers.Layer):
    """Stand-in for the unpublished training layer. keras.applications.efficientnet.preprocess_input is a
    pass-through: EfficientNetB3 rescales and normalises inside its own layers."""

    def call(self, x):
        return keras.applications.efficientnet.preprocess_input(x)


class FocalLoss(keras.losses.Loss):
    """Stand-in so the file loads; the loss is only used for training (we load with compile=False)."""

    def __init__(self, gamma=2.0, alpha=0.25, from_logits=False, **kwargs):
        super().__init__(**kwargs)
        self.gamma, self.alpha, self.from_logits = gamma, alpha, from_logits

    def call(self, y_true, y_pred):
        return keras.ops.zeros_like(y_pred[..., 0])


# A confident disease finding outranks "healthy"; FMD outranks lumpy for the buying decision
SEVERITY = {"foot-and-mouth": 2, "lumpy": 1, "healthy": 0}


class HealthModel:
    def __init__(self, cfg: dict, base_dir: str):
        self.cfg = cfg
        self.version = cfg["version"]
        self.classes = cfg["classes"]
        path = os.path.join(base_dir, cfg["path"])
        if not os.path.exists(path):
            d = cfg["download"]
            raise FileNotFoundError(
                f"{cfg['path']} is missing. Run: python scripts/download_models.py "
                f"(downloads {d['file']} from Hugging Face {d['repo']})"
            )
        self.model = keras.models.load_model(
            path,
            compile=False,
            custom_objects={"EfficientNetPreprocess": EfficientNetPreprocess, "FocalLoss": FocalLoss},
        )

    def preprocess(self, image: Image.Image) -> np.ndarray:
        size = self.cfg["input_size"]
        resized = image.resize((size, size), Image.Resampling.BILINEAR)
        return np.asarray(resized, dtype=np.float32)  # 0-255, no /255

    def predict(self, images: list[Image.Image], views: list[str] | None = None) -> dict:
        views = views or [f"image_{i + 1}" for i in range(len(images))]
        batch = np.stack([self.preprocess(im) for im in images])
        # The functional model expects its inputs as a dict keyed by the input layer's name
        probs = np.asarray(self.model({self.model.inputs[0].name: batch}, training=False))
        threshold = self.cfg["uncertain_threshold"]

        per_image = []
        for view, p in zip(views, probs):
            idx = int(np.argmax(p))
            confident = float(p[idx]) >= threshold
            per_image.append({
                "view": view,
                "condition": self.classes[idx] if confident else "uncertain",
                "confidence": round(float(p[idx]), 4),
                "probabilities": {c: round(float(v), 4) for c, v in zip(self.classes, p)},
            })

        # Any confident disease finding wins (worst first). Otherwise decide on the average over all photos,
        # so one weak photo doesn't overrule the rest.
        diseased = [r for r in per_image if r["condition"] in ("foot-and-mouth", "lumpy")]
        mean = probs.mean(axis=0)
        if diseased:
            worst = max(diseased, key=lambda r: (SEVERITY[r["condition"]], r["confidence"]))
            condition, confidence = worst["condition"], worst["confidence"]
        else:
            idx = int(np.argmax(mean))
            confidence = float(mean[idx])
            condition = self.classes[idx] if confidence >= threshold else "uncertain"

        return {
            "condition": condition,
            "confidence": round(confidence, 4),
            "mean_probabilities": {c: round(float(v), 4) for c, v in zip(self.classes, mean)},
            "per_image": per_image,
            "model_version": self.version,
        }
