"""
Read policy_terms.json from the backend folder and prepare a row for `policies`.

Usage (from repo root, with venv active):
  python -m backend.seed_policy
or:
  cd backend && python seed_policy.py

Requires: SUPABASE_URL, SUPABASE_ANON_KEY (service role recommended for inserts),
or use DATABASE_URL with psql — this script uses the Supabase Python client.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

BACKEND_DIR = Path(__file__).resolve().parent
POLICY_FILE = BACKEND_DIR / "policy_terms.json"


def load_policy_document() -> dict:
    if not POLICY_FILE.is_file():
        raise FileNotFoundError(f"Missing policy file: {POLICY_FILE}")
    with POLICY_FILE.open(encoding="utf-8") as f:
        return json.load(f)


def build_policies_row(terms: dict) -> dict:
    policy_code = terms.get("policy_id") or terms.get("policy_code")
    if not policy_code:
        raise ValueError("policy_terms.json must contain policy_id (or policy_code)")
    name = terms.get("policy_name") or "Policy"
    effective_from = terms.get("effective_date")
    return {
        "policy_code": policy_code,
        "name": name,
        "effective_from": effective_from,
        "effective_to": None,
        "terms": terms,
    }


def main() -> None:
    terms = load_policy_document()
    row = build_policies_row(terms)

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Prepared policies row (not inserted - missing Supabase env):\n")
        print(json.dumps(row, indent=2, default=str))
        print(
            "\nSet SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) "
            "to insert via Supabase."
        )
        sys.exit(0)

    from supabase import create_client

    url = url.strip().strip("'").strip('"')
    key = key.strip().strip("'").strip('"')
    client = create_client(url, key)
    # Upsert on policy_code if you add a unique constraint; plain insert for fresh DB
    res = client.table("policies").upsert(row, on_conflict="policy_code").execute()
    print("Upsert policies result:", res)


if __name__ == "__main__":
    main()
