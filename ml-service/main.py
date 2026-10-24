import logging
import os
import threading
from contextlib import asynccontextmanager

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault("TFHUB_CACHE_DIR", os.path.join(BASE_DIR, ".tfhub_cache"))

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from maweshi_ml.imaging import InvalidImage, decode_image, to_array
from maweshi_ml.quality import check_quality
from maweshi_ml.registry import ModelRegistry, load_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGES = 6

CONFIG = load_config()
registry = ModelRegistry(CONFIG)
# TF/Keras models aren't guaranteed thread-safe; one request per model at a time
MODEL_NAMES = ("gate", "species", "breed", "age", "health")
_locks = {name: threading.Lock() for name in MODEL_NAMES}


@asynccontextmanager
async def lifespan(app: FastAPI):
    only = os.getenv("ML_MODELS")  # e.g. "species,breed" to load a subset while developing
    await run_in_threadpool(registry.load_all, only.split(",") if only else None)
    yield


app = FastAPI(title="MaweshiAI ML Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _model(name: str):
    model = registry.get(name)
    if model is None:
        detail = registry.status.get(name, {}).get("error", "not loaded")
        raise HTTPException(status_code=503, detail=f"{name} model unavailable: {detail}")
    return model


async def _read_image(upload: UploadFile):
    data = await upload.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller")
    try:
        return await run_in_threadpool(decode_image, data)
    except InvalidImage as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


async def _read_images(uploads: list[UploadFile]):
    if not uploads:
        raise HTTPException(status_code=400, detail="At least one image is required")
    if len(uploads) > MAX_IMAGES:
        raise HTTPException(status_code=400, detail=f"At most {MAX_IMAGES} images per request")
    return [await _read_image(u) for u in uploads]


async def _run(name: str, fn, *args, **kwargs):
    def locked():
        with _locks[name]:
            return fn(*args, **kwargs)
    return await run_in_threadpool(locked)


@app.get("/")
def root() -> dict:
    return {"message": "MaweshiAI ML service is running"}


@app.get("/health")
def health() -> dict:
    loaded = all(registry.status.get(n, {}).get("loaded") for n in MODEL_NAMES)
    return {"status": "ok" if loaded else "degraded", "models": registry.status}


@app.post("/quality")
async def quality(image: UploadFile = File(...)) -> dict:
    img = await _read_image(image)
    return await run_in_threadpool(check_quality, to_array(img), CONFIG["quality"])


async def _species(img) -> dict:
    model = _model("species")
    gate = registry.get("gate")  # optional: without it there is no not-cattle check
    gate_result = await _run("gate", gate.predict, img) if gate is not None else None
    return await _run("species", model.predict, img, gate_result)


@app.post("/predict/species")
async def predict_species(image: UploadFile = File(...)) -> dict:
    img = await _read_image(image)
    return await _species(img)


@app.post("/predict/breed")
async def predict_breed(
    images: list[UploadFile] = File(..., description="Front, left and/or right photos"),
    species: str | None = Form(None, description="cow or buffalo, from the species step"),
    species_confidence: float | None = Form(None, ge=0, le=1, description="the species step's confidence"),
) -> dict:
    if species is not None and species not in ("cow", "buffalo"):
        raise HTTPException(status_code=400, detail="species must be 'cow' or 'buffalo'")
    model = _model("breed")
    imgs = await _read_images(images)
    return await _run("breed", model.predict, imgs, species, species_confidence)


@app.post("/predict/age")
async def predict_age(
    image: UploadFile = File(..., description="Photo of the lower incisors"),
    enforce_quality: bool = Query(True, description="false = predict even when the teeth photo fails the gate"),
) -> dict:
    model = _model("age")
    img = await _read_image(image)
    return await _run("age", model.predict, to_array(img), enforce_quality)


@app.post("/predict/health")
async def predict_health(
    images: list[UploadFile] = File(..., description="Body photos, optionally the teeth photo"),
    views: str | None = Form(None, description="Comma-separated view names in the same order, e.g. front,left,right"),
) -> dict:
    model = _model("health")
    imgs = await _read_images(images)
    names = [v.strip() for v in views.split(",")] if views else None
    if names is not None and len(names) != len(imgs):
        raise HTTPException(status_code=400, detail="views must name every image")
    return await _run("health", model.predict, imgs, names)


@app.post("/predict")
async def predict_legacy(bodyImage: UploadFile = File(...)) -> dict:
    """Original CattleEval endpoint, kept unchanged for the current backend until Module 2."""
    model = _model("species")
    img = await _read_image(bodyImage)
    probs = await _run("species", model.probabilities, img)
    label = int(probs.argmax())
    return {"species": "Cow" if label == 0 else "Buffalo", "confidence": round(float(probs.max()) * 100, 2)}
