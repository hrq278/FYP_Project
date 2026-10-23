"""Photo quality check for the capture screens: blur, darkness, glare and size. OpenCV only, ~20 ms."""

from __future__ import annotations

import cv2
import numpy as np


def blur_score(rgb: np.ndarray, long_side: int) -> float:
    """Variance of the Laplacian after resizing to a fixed long side (comparable across resolutions)."""
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape
    scale = long_side / max(h, w)
    gray = cv2.resize(gray, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def check_quality(rgb: np.ndarray, cfg: dict) -> dict:
    h, w = rgb.shape[:2]
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    blur = blur_score(rgb, cfg["blur_long_side"])
    brightness = float(cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)[..., 2].mean() / 255.0)
    clipped = float(((gray <= 5) | (gray >= 250)).mean())

    issues = []
    if min(h, w) < cfg["min_side_px"]:
        issues.append("too_small")
    if blur < cfg["min_blur"]:
        issues.append("blurry")
    if brightness < cfg["min_brightness"]:
        issues.append("too_dark")
    elif brightness > cfg["max_brightness"]:
        issues.append("too_bright")
    elif clipped > cfg["max_clipped_fraction"]:
        # Big black or white patches without an overall exposure problem: glare or a shadowed animal
        issues.append("too_dark" if (gray <= 5).mean() > (gray >= 250).mean() else "too_bright")

    return {
        "ok": not issues,
        "issues": issues,
        "blur_score": round(blur, 1),
        "brightness": round(brightness, 3),
        "clipped_fraction": round(clipped, 3),
        "width": w,
        "height": h,
    }
