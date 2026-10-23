"""Our serving code must give the same numbers as the team's original code (skipped when it isn't on disk)."""

import os
import sys

import numpy as np
import pytest
from conftest import AGE_PROJECT, BREED_EXPORT, fixture_path, teeth_photo
from PIL import Image

from maweshi_ml.age.pipeline import AgeModel
from maweshi_ml.imaging import decode_image, to_array
from maweshi_ml.registry import BASE_DIR, ModelRegistry, load_config


@pytest.fixture(scope="module")
def registry():
    return ModelRegistry(load_config()).load_all(only=["breed", "age"])


def test_age_matches_team_pipeline(registry):
    src = os.path.join(AGE_PROJECT, "src")
    path = teeth_photo("up to 8 year")
    if not os.path.isdir(src) or path is None:
        pytest.skip("age project or teeth dataset not available")
    sys.path.insert(0, src)
    try:
        from cattle_age.serve.pipeline import AgePipeline
    finally:
        sys.path.remove(src)
    theirs = AgePipeline(os.path.join(AGE_PROJECT, "outputs/final/serve"))

    with open(path, "rb") as f:
        rgb = to_array(decode_image(f.read()))
    expected = theirs.predict(rgb)
    # Same configuration as the team's export (fold 0, no test-time views, their quality thresholds); the
    # served model is the 5-fold ensemble + TTA, checked in test_served_age_model_is_the_ensemble
    single = {k: v for k, v in load_config()["age"].items() if k != "quality_overrides"}
    single.update({"onnx": "age.onnx", "tta_flip": False, "tta_scales": [1.0]})
    ours = AgeModel(single, BASE_DIR).predict(rgb)
    assert ours["age_years"] == expected.age_class
    assert ours["interval_90"] == expected.interval_90
    assert abs(ours["confidence"] - expected.confidence) < 1e-3


def test_breed_preprocessing_matches_export(registry):
    if not os.path.isfile(os.path.join(BREED_EXPORT, "inference.py")):
        pytest.skip("breed export folder not available")
    sys.path.insert(0, BREED_EXPORT)
    try:
        from inference import preprocess_image
    finally:
        sys.path.remove(BREED_EXPORT)

    model = registry.get("breed")
    path = fixture_path("cattle", "Cow_female_black_white.jpg")
    expected = preprocess_image(path, model.pre)[0]
    ours = model.preprocess(Image.open(path).convert("RGB"))
    np.testing.assert_allclose(ours, expected, atol=1e-6)


def test_served_age_model_is_the_ensemble(registry):
    model = registry.get("age")
    assert model.version.startswith("cpu_mobilenetv3-5fold-ensemble")
    assert len(model.views) == 4  # (no flip, flip) x (zoom 1.0, 1.15)
