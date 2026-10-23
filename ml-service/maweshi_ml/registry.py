"""Loads every model listed in models.yaml once at startup. One model failing doesn't stop the others."""

from __future__ import annotations

import logging
import os
import time

import yaml

log = logging.getLogger("maweshi_ml")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_config(path: str | None = None) -> dict:
    with open(path or os.path.join(BASE_DIR, "models.yaml"), encoding="utf-8") as f:
        return yaml.safe_load(f)


class ModelRegistry:
    def __init__(self, cfg: dict, base_dir: str = BASE_DIR):
        self.cfg = cfg
        self.base_dir = base_dir
        self.models: dict[str, object] = {}
        self.status: dict[str, dict] = {}

    def _load(self, name: str, factory) -> None:
        start = time.perf_counter()
        try:
            self.models[name] = factory(self.cfg[name], self.base_dir)
            self.status[name] = {
                "loaded": True,
                "version": getattr(self.models[name], "version", None),
                "load_seconds": round(time.perf_counter() - start, 1),
            }
            log.info("Loaded %s in %.1fs", name, time.perf_counter() - start)
        except Exception as exc:  # keep serving the other models
            self.status[name] = {"loaded": False, "error": f"{type(exc).__name__}: {exc}"}
            log.exception("Failed to load %s", name)

    def load_all(self, only: list[str] | None = None) -> "ModelRegistry":
        # Imported here so a broken dependency only takes down its own model
        def species(cfg, base):
            from maweshi_ml.species import SpeciesModel
            return SpeciesModel(cfg, base)

        def gate(cfg, base):
            from maweshi_ml.gate import CattleGate
            return CattleGate(cfg, base)

        def breed(cfg, base):
            from maweshi_ml.breed import BreedModel
            return BreedModel(cfg, base)

        def age(cfg, base):
            from maweshi_ml.age.pipeline import AgeModel
            return AgeModel(cfg, base)

        def health(cfg, base):
            from maweshi_ml.health import HealthModel
            return HealthModel(cfg, base)

        factories = {"gate": gate, "species": species, "breed": breed, "age": age, "health": health}
        for name, factory in factories.items():
            if only is None or name in only:
                self._load(name, factory)
        return self

    def get(self, name: str):
        return self.models.get(name)
