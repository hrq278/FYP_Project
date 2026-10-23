"""Breed model: ResNet-18 converted from PyTorch, 15 classes, gated by species and averaged across views."""

from __future__ import annotations

import json
import os

import keras
import tensorflow as tf
import numpy as np
from PIL import Image


class BreedModel:
    def __init__(self, cfg: dict, base_dir: str):
        self.cfg = cfg
        self.version = cfg["version"]
        self.labels = json.loads(open(os.path.join(base_dir, cfg["labels"]), encoding="utf-8").read())
        self.pre = json.loads(open(os.path.join(base_dir, cfg["preprocessing"]), encoding="utf-8").read())
        self.model = keras.models.load_model(os.path.join(base_dir, cfg["path"]), compile=False)
        # Compiled once per input shape: eager Keras calls are 5-10x slower on CPU
        self._infer = tf.function(lambda x: self.model(x, training=False), reduce_retracing=True)
        for species, names in cfg["species_classes"].items():
            unknown = set(names) - set(self.labels)
            if unknown:
                raise ValueError(f"models.yaml lists {species} breeds not in labels.json: {sorted(unknown)}")

    def _normalise(self, image: Image.Image) -> np.ndarray:
        array = np.asarray(image, dtype=np.float32) / np.float32(255)
        return (array - np.asarray(self.pre["mean"], np.float32)) / np.asarray(self.pre["std"], np.float32)

    def views(self, image: Image.Image) -> list[np.ndarray]:
        """Test-time views from models.yaml (`tta`): center (export preprocessing), full (whole frame resized,
        keeps head and tail that a center crop cuts off from side photos), plus their mirror images."""
        out = []
        for view in self.cfg.get("tta", ["center"]):
            base, _, flip = view.partition("_")
            if base == "center":
                x = self.preprocess(image)
            else:
                size = self.pre["image_size"]
                x = self._normalise(image.resize((size, size), Image.Resampling.BILINEAR))
            out.append(x[:, ::-1] if flip == "flip" else x)
        return out

    def preprocess(self, image: Image.Image) -> np.ndarray:
        """Same steps as the export's inference.py: short side to 256, center crop 224, ImageNet mean/std."""
        width, height = image.size
        short = self.pre["resize_size"]
        new_size = (short, int(short * height / width)) if width <= height else (int(short * width / height), short)
        image = image.resize(new_size, Image.Resampling.BILINEAR)
        size = self.pre["image_size"]
        left, top = int(round((image.width - size) / 2)), int(round((image.height - size) / 2))
        image = image.crop((left, top, left + size, top + size))
        return self._normalise(image)

    def predict(self, images: list[Image.Image], species: str | None = None) -> dict:
        batch = np.stack([v for im in images for v in self.views(im)])
        probs = self._infer(tf.constant(batch)).numpy()
        mean = probs.mean(axis=0)  # over all views of all photos

        # Only the breeds of the detected species can win; renormalise over them
        allowed = self.cfg["species_classes"].get(species) if species else None
        mask = np.array([name in allowed for name in self.labels]) if allowed else np.ones(len(self.labels), bool)
        gated = np.where(mask, mean, 0.0)
        gated = gated / gated.sum() if gated.sum() > 0 else mean

        order = [int(i) for i in np.argsort(gated)[::-1] if mask[i]][:3]
        top = order[0]
        names = self.cfg["display_names"]
        confidence = float(gated[top])
        return {
            "breed": names.get(self.labels[top], self.labels[top]),
            "breed_key": self.labels[top],
            "confidence": round(confidence, 4),
            "uncertain": confidence < self.cfg["uncertain_threshold"],
            "top3": [
                {"breed": names.get(self.labels[i], self.labels[i]), "breed_key": self.labels[i],
                 "confidence": round(float(gated[i]), 4)}
                for i in order
            ],
            "species_filter": species if allowed else None,
            "views": len(images),
            "model_version": self.version,
        }
