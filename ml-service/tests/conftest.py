import io
import os
import sys

import numpy as np
import pytest
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

FIXTURES = os.path.join(ROOT, "tests", "fixtures")
AGE_PROJECT = os.environ.get("MAWESHI_AGE_PROJECT", "F:/FYP/Models/Age Detection")
BREED_EXPORT = os.environ.get(
    "MAWESHI_BREED_EXPORT", "F:/FYP/Models/Breed/cattle-breed-classification-dataset/exports/cattle_breed_keras"
)
TEETH_DIR = os.environ.get("MAWESHI_TEETH_DIR", os.path.join(AGE_PROJECT, "Dataset/Dataset/Cattle Dentition Dataset"))


def fixture_path(folder: str, name: str) -> str:
    return os.path.join(FIXTURES, folder, name)


def fixture_bytes(folder: str, name: str) -> bytes:
    with open(fixture_path(folder, name), "rb") as f:
        return f.read()


def jpeg_bytes(array: np.ndarray) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(array.astype(np.uint8)).save(buf, "JPEG", quality=92)
    return buf.getvalue()


def teeth_photo(folder: str = "up to 3 year") -> str | None:
    """A real lower-incisor photo from the team's local dataset (not redistributable, so not in git)."""
    d = os.path.join(TEETH_DIR, folder)
    if not os.path.isdir(d):
        return None
    names = sorted(n for n in os.listdir(d) if n.lower().endswith((".png", ".jpg", ".jpeg")))
    return os.path.join(d, names[0]) if names else None


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    import main

    with TestClient(main.app) as c:  # runs the lifespan: loads every model once
        yield c
