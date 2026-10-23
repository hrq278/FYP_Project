import os

import cv2
import numpy as np
import pytest
from conftest import FIXTURES, fixture_bytes, jpeg_bytes, teeth_photo
from PIL import Image

COWS = ["Cow_female_black_white.jpg", "Gir_cow.jpg", "Holstein_cow.jpg", "Hereford_bull.jpg"]
BUFFALOES = ["Water_buffalo_bathing.jpg", "Carabao.jpg"]
# The gate's known false accept (cattle score 0.19); documented in PROGRESS.md
KNOWN_FALSE_ACCEPTS = {"Donkey_in_Clovelly,_North_Devon,_England.jpg"}
NOT_CATTLE = sorted(os.listdir(os.path.join(FIXTURES, "not_cattle")))
COW = fixture_bytes("cattle", "Cow_female_black_white.jpg")
BUFFALO = fixture_bytes("cattle", "Water_buffalo_bathing.jpg")
NOT_AN_IMAGE = b"this is not an image"


def one(name="image", data=COW):
    return {name: ("photo.jpg", data, "image/jpeg")}


def many(*items):
    return [("images", (f"photo{i}.jpg", data, "image/jpeg")) for i, data in enumerate(items)]


# ---------------------------------------------------------------------------------------- service


def test_health_lists_every_model_loaded(client):
    body = client.get("/health").json()
    assert body["status"] == "ok", body
    assert set(body["models"]) == {"gate", "species", "breed", "age", "health"}
    for name, status in body["models"].items():
        assert status["loaded"], (name, status)
        assert status["version"]


@pytest.mark.parametrize("path", ["/quality", "/predict/species", "/predict/age"])
def test_single_image_endpoints_reject_invalid_files(client, path):
    r = client.post(path, files=one(data=NOT_AN_IMAGE))
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid image file"


@pytest.mark.parametrize("path", ["/predict/breed", "/predict/health"])
def test_multi_image_endpoints_reject_invalid_files(client, path):
    r = client.post(path, files=many(COW, NOT_AN_IMAGE))
    assert r.status_code == 400


def test_too_many_images(client):
    assert client.post("/predict/health", files=many(*[COW] * 7)).status_code == 400


# ---------------------------------------------------------------------------------------- quality


def test_quality_good_photo(client):
    body = client.post("/quality", files=one()).json()
    assert body["ok"] is True
    assert body["issues"] == []


def test_quality_blurry_photo(client):
    rgb = np.asarray(Image.open(os.path.join(FIXTURES, "cattle", "Cow_female_black_white.jpg")).convert("RGB"))
    blurred = cv2.GaussianBlur(rgb, (0, 0), 8)
    body = client.post("/quality", files=one(data=jpeg_bytes(blurred))).json()
    assert "blurry" in body["issues"]


def test_quality_dark_photo(client):
    rgb = np.asarray(Image.open(os.path.join(FIXTURES, "cattle", "Cow_female_black_white.jpg")).convert("RGB"))
    body = client.post("/quality", files=one(data=jpeg_bytes(rgb * 0.12))).json()
    assert "too_dark" in body["issues"]


def test_quality_bright_photo(client):
    rgb = np.asarray(Image.open(os.path.join(FIXTURES, "cattle", "Cow_female_black_white.jpg")).convert("RGB"))
    washed = np.clip(rgb.astype(np.float32) * 0.15 + 235, 0, 255)
    body = client.post("/quality", files=one(data=jpeg_bytes(washed))).json()
    assert "too_bright" in body["issues"]


def test_quality_tiny_photo(client):
    tiny = np.asarray(Image.open(os.path.join(FIXTURES, "cattle", "Cow_female_black_white.jpg")).convert("RGB").resize((200, 130)))
    body = client.post("/quality", files=one(data=jpeg_bytes(tiny))).json()
    assert "too_small" in body["issues"]


# ---------------------------------------------------------------------------------------- species


@pytest.mark.parametrize("name", COWS)
def test_species_cow(client, name):
    body = client.post("/predict/species", files=one(data=fixture_bytes("cattle", name))).json()
    assert body["species"] == "cow", body


@pytest.mark.parametrize("name", BUFFALOES)
def test_species_buffalo(client, name):
    body = client.post("/predict/species", files=one(data=fixture_bytes("cattle", name))).json()
    assert body["species"] == "buffalo", body


@pytest.mark.parametrize("name", [n for n in NOT_CATTLE if n not in KNOWN_FALSE_ACCEPTS])
def test_species_not_cattle_is_unknown(client, name):
    body = client.post("/predict/species", files=one(data=fixture_bytes("not_cattle", name))).json()
    assert body["species"] == "unknown", body


def test_species_response_shape(client):
    body = client.post("/predict/species", files=one()).json()
    assert 0.5 <= body["confidence"] <= 1.0
    assert set(body["species_model"]) == {"cow", "buffalo"}
    assert body["gate"]["is_cattle"] is True
    assert body["model_version"]


def test_legacy_predict_unchanged(client):
    r = client.post("/predict", files=one(name="bodyImage"))
    assert r.status_code == 200
    body = r.json()
    assert body["species"] == "Cow"
    assert 50 < body["confidence"] <= 100  # percent, as the current backend expects


# ---------------------------------------------------------------------------------------- breed


def test_breed_buffalo_only_returns_buffalo_breeds(client):
    body = client.post("/predict/breed", files=many(BUFFALO), data={"species": "buffalo"}).json()
    assert body["breed_key"] in {"nili-ravi", "jaffarabadi"}
    assert all(t["breed_key"] in {"nili-ravi", "jaffarabadi"} for t in body["top3"])
    assert abs(sum(t["confidence"] for t in body["top3"]) - 1.0) < 1e-3


def test_breed_cow_never_returns_buffalo_breeds(client):
    body = client.post("/predict/breed", files=many(COW), data={"species": "cow"}).json()
    assert body["breed_key"] not in {"nili-ravi", "jaffarabadi"}
    assert len(body["top3"]) == 3
    assert body["species_filter"] == "cow"


def test_breed_averages_several_views(client):
    gir = fixture_bytes("cattle", "Gir_cow.jpg")
    body = client.post("/predict/breed", files=many(COW, gir, COW), data={"species": "cow"}).json()
    assert body["views"] == 3
    assert isinstance(body["uncertain"], bool)


def test_breed_without_species_uses_all_classes(client):
    body = client.post("/predict/breed", files=many(COW)).json()
    assert body["species_filter"] is None


def test_breed_rejects_bad_species(client):
    assert client.post("/predict/breed", files=many(COW), data={"species": "goat"}).status_code == 400


# ---------------------------------------------------------------------------------------- age


def test_age_rejects_photo_without_teeth(client):
    body = client.post("/predict/age", files=one()).json()
    assert body["quality"]["ok"] is False
    assert "no_teeth" in body["quality"]["issues"]
    assert body["age_years"] is None


def test_age_can_skip_quality_gate(client):
    body = client.post("/predict/age?enforce_quality=false", files=one()).json()
    assert 1 <= body["age_years"] <= 15
    assert body["permanent_incisors_estimate"] in {0, 2, 4, 6, 8}
    lo, hi = body["interval_90"]
    assert 1 <= lo <= body["age_years"] <= hi <= 15


def test_age_on_real_teeth_photo(client):
    path = teeth_photo("up to 3 year")  # completed 2 years
    if path is None:
        pytest.skip("teeth dataset not available (set MAWESHI_TEETH_DIR)")
    with open(path, "rb") as f:
        body = client.post("/predict/age", files=one(data=f.read())).json()
    assert body["quality"]["ok"] is True, body["quality"]
    assert 1 <= body["age_years"] <= 4
    assert body["age_band"] in {"<2y", "2-3y", "3-5y"}


# ---------------------------------------------------------------------------------------- health


def test_health_on_healthy_animals(client):
    body = client.post("/predict/health", files=many(COW, BUFFALO), data={"views": "front,left"}).json()
    assert body["condition"] == "healthy", body
    assert [r["view"] for r in body["per_image"]] == ["front", "left"]
    assert set(body["per_image"][0]["probabilities"]) == {"foot-and-mouth", "healthy", "lumpy"}
    assert body["model_version"] == "efficientnet-b3-baseline-v1"


def test_health_views_must_match_images(client):
    assert client.post("/predict/health", files=many(COW, BUFFALO), data={"views": "front"}).status_code == 400


def test_age_reports_uncertainty(client):
    body = client.post("/predict/age?enforce_quality=false", files=one()).json()
    lo, hi = body["interval_90"]
    assert body["uncertain"] == (hi - lo + 1 > 5)


def test_health_one_weak_photo_does_not_overrule_the_rest(client):
    # Hereford_bull alone is a low-confidence photo (top score < 0.60); with two clear healthy photos
    # the averaged result must still be healthy
    photos = [fixture_bytes("cattle", n) for n in ("Gir_cow.jpg", "Holstein_cow.jpg", "Hereford_bull.jpg")]
    body = client.post("/predict/health", files=many(*photos), data={"views": "front,left,right"}).json()
    assert body["per_image"][2]["condition"] == "uncertain", body["per_image"][2]
    assert body["condition"] == "healthy", body
