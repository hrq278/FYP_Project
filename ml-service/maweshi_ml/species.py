"""Species model (Cow vs Buffalo): Keras 2 MobileNetV2 with a TF Hub feature-vector layer."""

from __future__ import annotations

import json
import os
import re
import shutil
import zipfile

import cv2
import h5py
import numpy as np
import tensorflow as tf
import tensorflow_hub as hub
import tf_keras
from PIL import Image


def _purge_invalid_tfhub_cache(error: Exception) -> bool:
    message = str(error)
    if "contains neither 'saved_model.pb' nor 'saved_model.pbtxt'" not in message:
        return False

    match = re.search(r"'([^']+)'", message)
    if not match:
        return False

    module_path = match.group(1)
    if not os.path.isdir(module_path):
        return False

    saved_model_pb = os.path.join(module_path, "saved_model.pb")
    saved_model_pbtxt = os.path.join(module_path, "saved_model.pbtxt")
    if os.path.exists(saved_model_pb) or os.path.exists(saved_model_pbtxt):
        return False

    shutil.rmtree(module_path, ignore_errors=True)
    return True


def _load_keras_archive_fallback(model_archive_path: str):
    with zipfile.ZipFile(model_archive_path, "r") as archive:
        config = json.loads(archive.read("config.json"))
        layers = config.get("config", {}).get("layers", [])

        input_layer = next(layer for layer in layers if layer.get("class_name") == "InputLayer")
        hub_layer = next(layer for layer in layers if layer.get("class_name") == "KerasLayer")
        dense_layer = next(layer for layer in layers if layer.get("class_name") == "Dense")

        input_shape = tuple(input_layer.get("config", {}).get("batch_input_shape", [None, 224, 224, 3])[1:])
        handle = hub_layer.get("config", {}).get("handle")
        units = int(dense_layer.get("config", {}).get("units", 2))
        activation = dense_layer.get("config", {}).get("activation", "linear")

        # Extracted once; h5py needs a real file
        weights_cache_path = os.path.splitext(model_archive_path)[0] + ".weights.h5"
        if not os.path.exists(weights_cache_path):
            with archive.open("model.weights.h5", "r") as source, open(weights_cache_path, "wb") as target:
                target.write(source.read())

    inputs = tf_keras.Input(shape=input_shape, name=input_layer.get("name") or "input_1")
    features = hub.KerasLayer(
        handle,
        trainable=False,
        name=hub_layer.get("name") or "keras_layer",
    )(inputs)
    outputs = tf_keras.layers.Dense(
        units,
        activation=activation,
        name=dense_layer.get("name") or "dense",
    )(features)

    restored_model = tf_keras.Model(inputs, outputs, name=config.get("config", {}).get("name", "model"))

    # Build variables before assigning archived values.
    restored_model(np.zeros((1, *input_shape), dtype=np.float32), training=False)

    with h5py.File(weights_cache_path, "r") as weights_file:
        hub_group = weights_file["layers/keras_layer/vars"]
        dense_group = weights_file["layers/dense/vars"]

        hub_values = [
            np.array(hub_group[key])
            for key in sorted(hub_group.keys(), key=lambda value: int(value))
        ]
        hub_layer_vars = restored_model.get_layer(hub_layer.get("name") or "keras_layer").variables

        if len(hub_values) != len(hub_layer_vars):
            raise ValueError("Archived hub weights do not match runtime KerasLayer variable count")

        for variable, value in zip(hub_layer_vars, hub_values):
            variable.assign(value)

        dense_layer_obj = restored_model.get_layer(dense_layer.get("name") or "dense")
        dense_layer_obj.kernel.assign(np.array(dense_group["0"]))
        dense_layer_obj.bias.assign(np.array(dense_group["1"]))

    return restored_model


def _load_model(path: str):
    try:
        return tf_keras.models.load_model(path, custom_objects={"KerasLayer": hub.KerasLayer}, compile=False)
    except Exception as error:
        if _purge_invalid_tfhub_cache(error):
            return tf_keras.models.load_model(path, custom_objects={"KerasLayer": hub.KerasLayer}, compile=False)
        if not path.lower().endswith(".keras"):
            raise
        try:
            return _load_keras_archive_fallback(path)
        except Exception as fallback_error:
            if _purge_invalid_tfhub_cache(fallback_error):
                return _load_keras_archive_fallback(path)
            raise


class SpeciesModel:
    def __init__(self, cfg: dict, base_dir: str):
        self.cfg = cfg
        self.version = cfg["version"]
        self.classes = cfg["classes"]
        self.model = _load_model(os.path.join(base_dir, cfg["path"]))
        # Compiled once: the TF Hub layer is slow in eager mode (~800 ms per call)
        self._infer = tf.function(lambda x: self.model(x, training=False), reduce_retracing=True)

    def preprocess(self, image: Image.Image) -> np.ndarray:
        size = self.cfg["input_size"]
        rgb = cv2.resize(np.asarray(image), (size, size))
        return (rgb.astype(np.float32) / self.cfg["scale"])[None]

    def probabilities(self, image: Image.Image) -> np.ndarray:
        x = self.preprocess(image)
        # Always a batch of 2: the TF Hub layer takes ~720 ms for one image but ~30 ms for two
        flip = bool(self.cfg.get("tta_flip"))
        batch = np.concatenate([x, x[:, :, ::-1] if flip else x])
        probs = self._infer(tf.constant(batch)).numpy()
        return probs.mean(axis=0) if flip else probs[0]

    def predict(self, image: Image.Image, gate: dict | None = None) -> dict:
        """``gate`` is the CattleGate result for the same photo. Without it there is no not-cattle check."""
        probs = self.probabilities(image)
        own_buffalo = float(probs[self.classes.index("buffalo")])
        result = {
            "species_model": {c: round(float(p), 4) for c, p in zip(self.classes, probs)},
            "gate": gate,
            "model_version": self.version,
        }
        if gate is not None and not gate["is_cattle"]:
            return {"species": "unknown", "confidence": round(1.0 - gate["cattle_score"], 4), **result}

        # Weighted cow/buffalo opinion; models.yaml gives the weights and the cut-off (tuned for balanced accuracy)
        share = gate["buffalo_share"] if gate else None
        w = self.cfg["species_model_weight"] if share is not None else 1.0
        th = self.cfg["buffalo_threshold"] if share is not None else 0.5
        p_buffalo = w * own_buffalo + (1 - w) * (share if share is not None else 0.0)
        species = "buffalo" if p_buffalo >= th else "cow"
        # Confidence: how far the score sits from the cut-off, scaled to 0.5-1.0
        margin = (p_buffalo - th) / (1 - th) if species == "buffalo" else (th - p_buffalo) / th
        return {
            "species": species,
            "confidence": round(0.5 + 0.5 * min(1.0, margin), 4),
            "buffalo_score": round(p_buffalo, 4),
            **result,
        }
