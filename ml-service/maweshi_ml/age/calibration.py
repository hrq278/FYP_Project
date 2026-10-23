"""Vendored from the team's age project (F:/FYP/Models/Age Detection, src/cattle_age/eval/calibration.py).
Copied verbatim so serving matches training; do not edit here, change the source project instead."""

from __future__ import annotations

import numpy as np


def apply_temperature(probs: np.ndarray, t: float) -> np.ndarray:
    logp = np.log(np.clip(probs, 1e-12, 1.0)) / t
    logp -= logp.max(axis=1, keepdims=True)
    e = np.exp(logp)
    return e / e.sum(axis=1, keepdims=True)


def _grow_order(p: np.ndarray) -> list[int]:
    """Class indices in the order the ordinal interval absorbs them (mode first, then the larger neighbour)."""
    k = len(p)
    lo = hi = int(p.argmax())
    order = [lo]
    while len(order) < k:
        left = p[lo - 1] if lo > 0 else -1.0
        right = p[hi + 1] if hi < k - 1 else -1.0
        if left >= right:
            lo -= 1
            order.append(lo)
        else:
            hi += 1
            order.append(hi)
    return order


def predict_intervals(probs: np.ndarray, threshold: float) -> np.ndarray:
    """(N, 2) inclusive 0-based class bounds: grown classes whose cumulative mass is <= ``threshold`` (the mode
    always). A class is inside exactly when its conformity score is <= threshold, matching calibration."""
    out = np.empty((len(probs), 2), int)
    for i, p in enumerate(probs):
        order = _grow_order(p)
        mass, members = p[order[0]], [order[0]]
        for c in order[1:]:
            mass += p[c]
            if mass > threshold + 1e-12:
                break
            members.append(c)
        out[i] = (min(members), max(members))
    return out
