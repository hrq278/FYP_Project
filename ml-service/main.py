import json
import os
import re
import shutil
import zipfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault("TFHUB_CACHE_DIR", os.path.join(BASE_DIR, ".tfhub_cache"))

import cv2
import h5py
import numpy as np
import tf_keras
import tensorflow_hub as hub
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="CattleEval ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.getenv("MODEL_PATH", "./model/SpecieDetector.keras")
RESOLVED_MODEL_PATH = MODEL_PATH if os.path.isabs(MODEL_PATH) else os.path.join(BASE_DIR, MODEL_PATH)
model = None


def _purge_invalid_tfhub_cache(error: Exception) -> bool:
    message = str(error)
    if "contains neither 'saved_model.pb' nor 'saved_model.pbtxt'" not in message:
        return False

    match = re.search(r"'([^']+)'", message)
    if not match:
        return False

    module_path = match.group(1)
    if not os.path.isdir(module_path):
        return False

    saved_model_pb = os.path.join(module_path, "saved_model.pb")
    saved_model_pbtxt = os.path.join(module_path, "saved_model.pbtxt")
    if os.path.exists(saved_model_pb) or os.path.exists(saved_model_pbtxt):
        return False

    shutil.rmtree(module_path, ignore_errors=True)
    return True


def _load_keras_archive_fallback(model_archive_path: str):
    with zipfile.ZipFile(model_archive_path, "r") as archive:
        config = json.loads(archive.read("config.json"))
        layers = config.get("config", {}).get("layers", [])

        input_layer = next(layer for layer in layers if layer.get("class_name") == "InputLayer")
        hub_layer = next(layer for layer in layers if layer.get("class_name") == "KerasLayer")
        dense_layer = next(layer for layer in layers if layer.get("class_name") == "Dense")

        input_shape = tuple(input_layer.get("config", {}).get("batch_input_shape", [None, 224, 224, 3])[1:])
        handle = hub_layer.get("config", {}).get("handle")
        units = int(dense_layer.get("config", {}).get("units", 2))
        activation = dense_layer.get("config", {}).get("activation", "linear")

        weights_cache_path = os.path.splitext(model_archive_path)[0] + ".weights.h5"
        with archive.open("model.weights.h5", "r") as source, open(weights_cache_path, "wb") as target:
            target.write(source.read())

    inputs = tf_keras.Input(shape=input_shape, name=input_layer.get("name") or "input_1")
    features = hub.KerasLayer(
        handle,
        trainable=False,
        name=hub_layer.get("name") or "keras_layer",
    )(inputs)
    outputs = tf_keras.layers.Dense(
        units,
        activation=activation,
        name=dense_layer.get("name") or "dense",
    )(features)

    restored_model = tf_keras.Model(inputs, outputs, name=config.get("config", {}).get("name", "model"))

    # Build variables before assigning archived values.
    restored_model(np.zeros((1, *input_shape), dtype=np.float32), training=False)

    with h5py.File(weights_cache_path, "r") as weights_file:
        hub_group = weights_file["layers/keras_layer/vars"]
        dense_group = weights_file["layers/dense/vars"]

        hub_values = [
            np.array(hub_group[key])
            for key in sorted(hub_group.keys(), key=lambda value: int(value))
        ]
        hub_layer_vars = restored_model.get_layer(hub_layer.get("name") or "keras_layer").variables

        if len(hub_values) != len(hub_layer_vars):
            raise ValueError("Archived hub weights do not match runtime KerasLayer variable count")

        for variable, value in zip(hub_layer_vars, hub_values):
            variable.assign(value)

        dense_layer_obj = restored_model.get_layer(dense_layer.get("name") or "dense")
        dense_layer_obj.kernel.assign(np.array(dense_group["0"]))
        dense_layer_obj.bias.assign(np.array(dense_group["1"]))

    return restored_model


@app.on_event("startup")
def load_model() -> None:
    global model
    try:
        model = tf_keras.models.load_model(
            RESOLVED_MODEL_PATH,
            custom_objects={"KerasLayer": hub.KerasLayer},
            compile=False,
        )
        return
    except Exception as error:
        if _purge_invalid_tfhub_cache(error):
            model = tf_keras.models.load_model(
                RESOLVED_MODEL_PATH,
                custom_objects={"KerasLayer": hub.KerasLayer},
                compile=False,
            )
            return
        if not RESOLVED_MODEL_PATH.lower().endswith(".keras"):
            raise error
        try:
            model = _load_keras_archive_fallback(RESOLVED_MODEL_PATH)
        except Exception as fallback_error:
            if _purge_invalid_tfhub_cache(fallback_error):
                model = _load_keras_archive_fallback(RESOLVED_MODEL_PATH)
            else:
                raise


@app.get("/")
def health() -> dict:
    return {"message": "CattleEval ML service is running"}


@app.post("/predict")
async def predict(bodyImage: UploadFile = File(...)) -> dict:
    global model

    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    file_bytes = await bodyImage.read()
    np_arr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image = cv2.resize(image, (224, 224))
    image = image.astype(np.float32) / 255.0
    image = np.reshape(image, (1, 224, 224, 3))

    prediction = model.predict(image)
    logits = prediction[0]

    label = int(np.argmax(logits))
    species = "Cow" if label == 0 else "Buffalo"
    confidence = round(float(np.max(logits)) * 100, 2)

    return {"species": species, "confidence": confidence}
