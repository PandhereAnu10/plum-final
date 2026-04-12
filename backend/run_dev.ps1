# Run FastAPI with the project venv (avoids broken global supabase/websockets stacks).
# Excludes .venv from --reload so pip installs do not restart the server endlessly.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$venvPy = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
    Write-Host "Creating .venv and installing dependencies..."
    python -m venv .venv
    & (Join-Path $PSScriptRoot ".venv\Scripts\pip.exe") install -r requirements.txt
}

& $venvPy -m pip install -q -r requirements.txt
& $venvPy -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 `
    --reload-exclude ".venv" `
    --reload-exclude "**/.venv/**"
