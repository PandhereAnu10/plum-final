"""OCR helpers using Tesseract (local install required on Windows)."""

from __future__ import annotations

import io
import os
from typing import BinaryIO

import pytesseract
from PIL import Image, UnidentifiedImageError

# --- Tesseract Configuration ---

# 1. Check if an environment variable is set (Best for Render/Docker)
if os.getenv("TESSERACT_CMD"):
    pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]
# 2. If on Windows, check the default installation path
elif os.name == 'nt':
    _DEFAULT_TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.isfile(_DEFAULT_TESSERACT):
        pytesseract.pytesseract.tesseract_cmd = _DEFAULT_TESSERACT
# 3. If on Linux (Render/Docker), it should be in the system PATH
else:
    # On Linux, 'tesseract' is the command installed to /usr/bin/tesseract
    pytesseract.pytesseract.tesseract_cmd = 'tesseract'

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
        
        # We use lang='eng' for better accuracy on medical terms
        text = pytesseract.image_to_string(image, lang='eng')
        return text.strip() if text else ""

    except UnidentifiedImageError as exc:
        raise ValueError(
            "Unsupported or corrupt image. Upload a PNG/JPEG/WebP image."
        ) from exc
    except pytesseract.TesseractNotFoundError as exc:
        # Provide a helpful error based on the OS
        error_msg = "Tesseract not found. "
        if os.name == 'nt':
            error_msg += "Please install from https://github.com/UB-Mannheim/tesseract/wiki"
        else:
            error_msg += "Ensure tesseract-ocr is installed via apt-get in your Dockerfile."
            
        raise RuntimeError(error_msg) from exc

def extract_text_from_fileobj(fileobj: BinaryIO) -> str:
    return extract_text_from_image(fileobj.read())