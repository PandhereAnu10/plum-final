from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
# Policy artifacts are shipped next to backend code (Docker / Render COPY).
REPO_ROOT = BACKEND_DIR
