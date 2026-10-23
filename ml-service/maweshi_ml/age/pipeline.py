"""Age from a lower-incisor photo: quality gate -> incisor segmenter -> crop -> age model -> calibration.

Adapted from the team's age project (src/cattle_age/serve/pipeline.py). The preprocessing and calibration
steps are unchanged; only the output shape is MaweshiAI's. numpy + OpenCV + onnxruntime only.
"""

from __future__ import annotations

import json
import os

import cv2
import numpy as np
import onnxruntime as ort

from maweshi_ml.age.calibration import apply_temperature, predict_intervals
from maweshi_ml.age.roi import clean_mask, letterbox, make_variants, unletterbox
from maweshi_ml.quality import blur_score

AGES = tuple(range(1, 16))  # completed years
GROUP4_BOUNDS = ((1, 4), (5, 8), (9, 12), (13, 15))

RETAKE = {
    "blurry": "The photo is blurry. Hold the phone steady and tap to focus on the teeth.",
    "no_teeth": "The lower incisors were not found. Fill the frame with the front teeth.",
    "low_confidence": "The teeth could not be outlined reliably. Retake in better light, front-on.",
}


def age_band(years: int) -> str:
    if years < 2:
        return "<2y"
    if years < 3:
        return "2-3y"
    if years < 5:
        return "3-5y"
    if years < 9:
        return "5-8y"
    return "9y+"


class AgeModel:
    def __init__(self, cfg: dict, base_dir: str):
        self.cfg = cfg
        self.dir = os.path.join(base_dir, cfg["dir"])
        with open(os.path.join(self.dir, "serve.json"), encoding="utf-8") as f:
            self.spec = json.load(f)
        providers = ["CPUExecutionProvider"]
        self.age = ort.InferenceSession(os.path.join(self.dir, self.spec["age"]["onnx"]), providers=providers)
        self.seg = ort.InferenceSession(os.path.join(self.dir, self.spec["segmenter"]["onnx"]), providers=providers)
        self.version = self.spec["model_version"]

    @staticmethod
    def _normalise(img: np.ndarray, mean, std) -> np.ndarray:
        x = img.astype(np.float32) / 255.0
        x = (x - np.asarray(mean, np.float32)) / np.asarray(std, np.float32)
        return x.transpose(2, 0, 1)[None]

    def segment(self, img: np.ndarray) -> tuple[np.ndarray, float]:
        s = self.spec["segmenter"]
        x, lb = letterbox(img, s["image_size"])
        prob = self.seg.run(None, {"image": self._normalise(x, s["mean"], s["std"])})[0][0, 0]
        prob = unletterbox(prob, lb)
        mask = clean_mask(prob, s["threshold"])
        fg = prob[mask > 0]
        return mask, float(fg.mean()) if fg.size else 0.0

    def model_input(self, img: np.ndarray, mask: np.ndarray | None) -> np.ndarray:
        a = self.spec["age"]
        v = make_variants(img, mask, a["cache_long_side"], a["crop_margin"], a.get("pad_mode", "constant"))
        chosen = v.get(a["input_variant"], v["raw_full"])
        return cv2.resize(chosen, (a["image_size"], a["image_size"]), interpolation=cv2.INTER_AREA)

    def incisors_estimate(self, years: int) -> int:
        table = {int(k): v for k, v in self.cfg["incisors_by_age"].items()}
        return table.get(years, self.cfg["incisors_full_mouth"])

    def predict(self, rgb: np.ndarray, enforce_quality: bool = True) -> dict:
        """``rgb`` is RGB uint8. With a failed quality gate (and enforce_quality) the age fields are None."""
        q = self.spec["quality"]
        reasons: list[str] = []
        diag: dict[str, float] = {"blur": blur_score(rgb, q["blur_long_side"])}
        if diag["blur"] < q["min_blur"]:
            reasons.append("blurry")
        mask, conf = self.segment(rgb)
        diag["mask_fraction"] = float((mask > 0).mean())
        diag["segmentation_confidence"] = conf
        if diag["mask_fraction"] < q["min_mask_frac"]:
            reasons.append("no_teeth")
        elif conf < q["min_seg_confidence"]:
            reasons.append("low_confidence")

        quality = {
            "ok": not reasons,
            "issues": reasons,
            "message": None if not reasons else "Please retake the photo: " + " ".join(RETAKE[r] for r in reasons),
            **{k: round(v, 4) for k, v in diag.items()},
        }
        result = {
            "age_years": None, "age_years_expected": None, "age_band": None,
            "permanent_incisors_estimate": None, "interval_90": None, "confidence": None,
            "uncertain": None, "quality": quality, "model_version": self.version,
        }
        if reasons and enforce_quality:
            return result

        use_mask = mask if (mask > 0).any() else None
        a = self.spec["age"]
        probs, _reg = self.age.run(None, {"image": self._normalise(self.model_input(rgb, use_mask), a["mean"], a["std"])})
        c = self.spec["calibration"]
        p = apply_temperature(probs.astype(np.float64), c["temperature"])[0]
        lo, hi = predict_intervals(p[None], c["conformal_threshold"])[0]
        years = int(p.argmax()) + 1
        interval_width = int(hi) - int(lo) + 1
        result.update({
            # The calibrated 90 % interval is the honest measure: a wide one means "don't trust the number"
            "uncertain": interval_width > self.cfg["uncertain_max_interval_years"],
            "age_years": years,
            "age_years_expected": round(float(p @ np.arange(1, len(AGES) + 1)), 2),
            "age_band": age_band(years),
            "permanent_incisors_estimate": self.incisors_estimate(years),
            "interval_90": [int(lo) + 1, int(hi) + 1] if c.get("calibrated", True) else None,
            "confidence": round(float(p.max()), 4),
            "group4": [round(float(p[lo_ - 1: hi_].sum()), 4) for lo_, hi_ in GROUP4_BOUNDS],
        })
        return result
