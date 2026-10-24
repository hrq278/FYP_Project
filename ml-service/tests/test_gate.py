"""Cattle-gate decision rules, with made-up ImageNet scores (no model download needed)."""
import numpy as np
from PIL import Image

from maweshi_ml.gate import CattleGate

# Fake class order: 0 ox, 1 water_buffalo, 2 oxcart, 3 ram, 4 bighorn, 5 anything else
NAMES = {0: "ox", 1: "water_buffalo", 2: "oxcart", 3: "ram", 4: "bighorn", 5: "other"}


class FakeOut:
    def __init__(self, probs, n):
        self.value = np.array([probs] * n, dtype=np.float32)

    def numpy(self):
        return self.value


def gate_with(probs, **cfg):
    g = CattleGate.__new__(CattleGate)
    g.cfg = {"input_size": 8, "cattle_threshold": 0.02, "sheep_ratio": 1.0, "tta_flip": True, **cfg}
    g.version = "test"
    g.cow_idx, g.buffalo_idx, g.context_idx, g.sheep_idx = [0], [1], [2], [3, 4]
    g.names = NAMES
    g._infer = lambda batch: FakeOut(probs, int(batch.shape[0]))
    return g


IMAGE = Image.new("RGB", (16, 16))


def test_clear_cow_is_cattle():
    r = gate_with([0.7, 0.05, 0.05, 0.0, 0.0, 0.2]).predict(IMAGE)
    assert r["is_cattle"] and r["cattle_score"] == 0.8 and r["sheep_score"] == 0.0


def test_below_threshold_is_not_cattle():
    assert not gate_with([0.01, 0.0, 0.0, 0.0, 0.0, 0.99]).predict(IMAGE)["is_cattle"]


def test_sheep_with_some_ox_score_is_rejected():
    # 5 % ox would pass the threshold alone, but ram + bighorn outweigh it
    r = gate_with([0.05, 0.0, 0.0, 0.40, 0.10, 0.45]).predict(IMAGE)
    assert not r["is_cattle"] and r["sheep_score"] == 0.5


def test_cow_with_a_little_ram_score_stays_cattle():
    assert gate_with([0.30, 0.0, 0.05, 0.10, 0.0, 0.55]).predict(IMAGE)["is_cattle"]


def test_sheep_rule_can_be_switched_off():
    g = gate_with([0.05, 0.0, 0.0, 0.40, 0.10, 0.45])
    g.sheep_idx = []
    assert g.predict(IMAGE)["is_cattle"]
