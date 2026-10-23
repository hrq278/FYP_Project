"""Decode uploads once, with the phone's EXIF rotation applied, for every model to share."""

from __future__ import annotations

import io

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

# Phone photos are compressed to <= 1280 px by the app; this only guards against decompression bombs.
Image.MAX_IMAGE_PIXELS = 60_000_000


class InvalidImage(ValueError):
    pass


def decode_image(data: bytes) -> Image.Image:
    """Bytes of a JPEG/PNG/WebP upload -> upright RGB PIL image (alpha composited on white)."""
    try:
        with Image.open(io.BytesIO(data)) as raw:
            image = ImageOps.exif_transpose(raw)
            if image.mode in ("RGBA", "LA") or "transparency" in image.info:
                rgba = image.convert("RGBA")
                image = Image.alpha_composite(Image.new("RGBA", rgba.size, (255, 255, 255, 255)), rgba)
            return image.convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise InvalidImage("Invalid image file") from exc


def to_array(image: Image.Image) -> np.ndarray:
    """RGB uint8 (H, W, 3)."""
    return np.asarray(image, dtype=np.uint8)
