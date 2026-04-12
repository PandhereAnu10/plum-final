"""Load mock claim payloads from repo-root test_cases.json (backend/../test_cases.json)."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

# Repo root: one level up from backend/ → ../test_cases.json
_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent
_TEST_CASES_FILE = _REPO_ROOT / "test_cases.json"


@lru_cache
def _cases_path() -> Path:
    return _TEST_CASES_FILE


@lru_cache
def _all_cases() -> list[dict[str, Any]]:
    path = _cases_path()
    if not path.is_file():
        raise FileNotFoundError(
            f"test_cases.json not found at {path} (expected backend/../test_cases.json)"
        )
    raw = json.loads(path.read_text(encoding="utf-8"))
    return list(raw.get("test_cases", []))


def get_case_by_id(case_id: str) -> dict[str, Any]:
    cid = case_id.strip().upper()
    for row in _all_cases():
        if row.get("case_id") == cid:
            return row
    raise KeyError(f"Unknown case_id: {case_id}")


def mock_documents_as_text(input_data: dict[str, Any]) -> str:
    """Simulate OCR output from structured test-case documents."""
    parts = [
        "=== Simulated document extraction (test fixture; not from OCR) ===",
        json.dumps(input_data, indent=2, default=str),
    ]
    return "\n".join(parts)
