"""OCR helpers using Tesseract (local install required on Windows)."""

from __future__ import annotations

import io
import os
from typing import BinaryIO

import pytesseract
from PIL import Image, UnidentifiedImageError

# Windows default install path (assignment requirement)
_DEFAULT_TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.isfile(_DEFAULT_TESSERACT):
    pytesseract.pytesseract.tesseract_cmd = _DEFAULT_TESSERACT
elif os.getenv("TESSERACT_CMD"):
    pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]


def extract_text_from_image(data: bytes) -> str:
    """
    Extract UTF-8 text from an image (PNG/JPEG/WebP, etc.) using pytesseract.
    """
    if not data:
        return ""
    try:
        image = Image.open(io.BytesIO(data))
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        return pytesseract.image_to_string(image) or ""
    except UnidentifiedImageError as exc:
        raise ValueError(
            "Unsupported or corrupt image. Upload a PNG/JPEG/WebP image."
        ) from exc
    except pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError(
            "Tesseract is not installed or not on PATH. "
            "Install from https://github.com/UB-Mannheim/tesseract/wiki "
            "or set TESSERACT_CMD to tesseract.exe."
        ) from exc


def extract_text_from_fileobj(fileobj: BinaryIO) -> str:
    return extract_text_from_image(fileobj.read())
