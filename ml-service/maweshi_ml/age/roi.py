"""Vendored from the team's age project (F:/FYP/Models/Age Detection, src/cattle_age/roi/masks.py).
Copied verbatim so serving matches training; do not edit here, change the source project instead."""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

VARIANTS: tuple[str, ...] = ("raw_full", "masked_full", "raw_crop", "masked_crop")


def fill_holes(mask: np.ndarray) -> np.ndarray:
    """Fill background regions not connected to the image border (0/1 in, 0/1 out)."""
    h, w = mask.shape
    flood = np.pad(mask, 1).astype(np.uint8)
    cv2.floodFill(flood, np.zeros((h + 4, w + 4), np.uint8), (0, 0), 1)
    holes = flood[1:-1, 1:-1] == 0
    return (mask.astype(bool) | holes).astype(np.uint8)


def clean_mask(prob: np.ndarray, threshold: float = 0.5, min_rel_area: float = 0.1) -> np.ndarray:
    """Binary 0/255 mask from a probability map: threshold, drop components smaller than ``min_rel_area`` x the
    largest (separated incisors are kept), fill holes."""
    m = (prob > threshold).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    if n > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        keep = np.zeros(n, bool)
        keep[1:] = areas >= min_rel_area * areas.max()
        m = keep[labels].astype(np.uint8)
    return fill_holes(m) * 255


@dataclass(frozen=True)
class Letterbox:
    scale: float
    top: int
    left: int
    h: int  # original size
    w: int
    size: int


def letterbox(img: np.ndarray, size: int, interp: int = cv2.INTER_AREA) -> tuple[np.ndarray, Letterbox]:
    """Aspect-preserving resize to ``size`` long side + centred zero padding, with the parameters to undo it."""
    h, w = img.shape[:2]
    s = size / max(h, w)
    nh, nw = max(1, round(h * s)), max(1, round(w * s))
    resized = cv2.resize(img, (nw, nh), interpolation=interp)
    top, left = (size - nh) // 2, (size - nw) // 2
    out = cv2.copyMakeBorder(
        resized, top, size - nh - top, left, size - nw - left, cv2.BORDER_CONSTANT, value=0
    )
    return out, Letterbox(s, top, left, h, w, size)


def unletterbox(pred: np.ndarray, lb: Letterbox) -> np.ndarray:
    """Map a (size, size) prediction back to the original (h, w) image."""
    nh, nw = max(1, round(lb.h * lb.scale)), max(1, round(lb.w * lb.scale))
    crop = pred[lb.top : lb.top + nh, lb.left : lb.left + nw]
    return cv2.resize(crop, (lb.w, lb.h), interpolation=cv2.INTER_LINEAR)


@dataclass(frozen=True)
class Box:
    x0: int
    y0: int
    x1: int
    y1: int

    @property
    def width(self) -> int:
        return self.x1 - self.x0

    @property
    def height(self) -> int:
        return self.y1 - self.y0


def mask_bbox(mask: np.ndarray, margin: float = 0.10) -> Box | None:
    """Bounding box of the foreground plus ``margin`` x box size on every side, clipped to the image."""
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return None
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    mx, my = round(margin * (x1 - x0)), round(margin * (y1 - y0))
    h, w = mask.shape[:2]
    return Box(max(0, x0 - mx), max(0, y0 - my), min(w, x1 + mx), min(h, y1 + my))


def letterbox_square(img: np.ndarray, size: int, pad_mode: str = "constant") -> np.ndarray:
    """Resize so the long side equals ``size`` (aspect preserved) and pad to ``size`` x ``size``."""
    h, w = img.shape[:2]
    s = size / max(h, w)
    nh, nw = max(1, round(h * s)), max(1, round(w * s))
    interp = cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC
    img = cv2.resize(img, (nw, nh), interpolation=interp)
    top, left = (size - nh) // 2, (size - nw) // 2
    border = cv2.BORDER_REFLECT_101 if pad_mode == "reflect" else cv2.BORDER_CONSTANT
    return cv2.copyMakeBorder(img, top, size - nh - top, left, size - nw - left, border, value=0)


def make_variants(
    raw: np.ndarray, mask: np.ndarray | None, size: int, margin: float, pad_mode: str = "constant"
) -> dict[str, np.ndarray]:
    """The four model inputs at ``size`` x ``size``. Without a mask every variant falls back to raw_full."""
    full = letterbox_square(raw, size, pad_mode)
    box = mask_bbox(mask, margin) if mask is not None else None
    if box is None:
        return dict.fromkeys(VARIANTS, full)
    masked = raw * (mask[..., None] > 0)
    crop = (slice(box.y0, box.y1), slice(box.x0, box.x1))
    return {
        "raw_full": full,
        "masked_full": letterbox_square(masked, size, pad_mode),
        "raw_crop": letterbox_square(raw[crop], size, pad_mode),
        "masked_crop": letterbox_square(masked[crop], size, pad_mode),
    }
