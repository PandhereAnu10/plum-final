"""Supabase persistence helpers for claims pipeline."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Optional

# Import supabase lazily inside get_supabase() so the API can boot (e.g. /health)
# even when optional native deps are misaligned, and to avoid pulling realtime
# before a DB call. Use backend/.venv + requirements.txt for a known-good stack.


def get_supabase() -> Any:
    from supabase import create_client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError(
            "Supabase credentials missing from environment variables "
            "(SUPABASE_URL and SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY)."
        )
    url = url.strip().strip("'").strip('"')
    key = key.strip().strip("'").strip('"')
    return create_client(url, key)


def fetch_policy_id(client: Any, policy_code: str) -> str:
    res = (
        client.table("policies")
        .select("id")
        .eq("policy_code", policy_code)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise LookupError(
            f"No policy row for code {policy_code!r}. Run: python backend/seed_policy.py"
        )
    return str(res.data[0]["id"])


def insert_claim(
    client: Any,
    *,
    policy_id: str,
    member_id: str,
    member_name: str,
    treatment_date: str,
    claim_amount: float,
    status: str,
    metadata: Optional[dict[str, Any]] = None,
) -> str:
    row = {
        "policy_id": policy_id,
        "member_id": member_id,
        "member_name": member_name,
        "treatment_date": treatment_date,
        "claim_amount": claim_amount,
        "status": status,
        "metadata": metadata or {},
    }
    res = client.table("claims").insert(row).execute()
    if not res.data:
        raise RuntimeError("Failed to insert claim (no data returned).")
    return str(res.data[0]["id"])


def insert_claim_document(
    client: Any,
    *,
    claim_id: str,
    doc_type: str,
    storage_path: str,
    mime_type: Optional[str],
) -> None:
    client.table("claim_documents").insert(
        {
            "claim_id": claim_id,
            "doc_type": doc_type,
            "storage_path": storage_path,
            "mime_type": mime_type,
        }
    ).execute()


def insert_extracted_data(
    client: Any,
    *,
    claim_id: str,
    raw_ocr_text: str,
    structured: dict[str, Any],
    model: Optional[str] = None,
    extraction_version: Optional[str] = None,
) -> None:
    client.table("extracted_data").insert(
        {
            "claim_id": claim_id,
            "raw_ocr_text": raw_ocr_text,
            "structured": structured,
            "model": model,
            "extraction_version": extraction_version,
        }
    ).execute()


def insert_adjudication_result(
    client: Any,
    *,
    claim_id: str,
    payload: dict[str, Any],
) -> None:
    deductions = payload.get("deductions") if isinstance(payload.get("deductions"), dict) else {}
    rejected_items = payload.get("rejected_items")
    reasons = payload.get("rejection_reasons") or []
    if not isinstance(reasons, list):
        reasons = [str(reasons)]
    reasons = [str(x) for x in reasons]

    step_trace: dict[str, Any] = {}
    for key in ("flags", "fraud_indicators", "cashless_approved", "network_discount"):
        val = payload.get(key)
        if val is not None:
            step_trace[key] = val

    row = {
        "claim_id": claim_id,
        "decision": str(payload.get("decision", "MANUAL_REVIEW")),
        "approved_amount": payload.get("approved_amount"),
        "deductions": deductions or {},
        "rejected_items": rejected_items,
        "rejection_reasons": reasons,
        "confidence_score": payload.get("confidence_score"),
        "reasoning": payload.get("reasoning"),
        "notes": payload.get("notes"),
        "step_trace": step_trace,
    }
    client.table("adjudication_results").insert(row).execute()


def update_claim_status(client: Any, claim_id: str, status: str) -> None:
    client.table("claims").update({"status": status}).eq("id", claim_id).execute()


def patch_adjudication_by_claim_id(
    client: Any,
    *,
    claim_id: str,
    decision: str,
    approved_amount: Optional[float] = None,
    notes: Optional[str] = None,
) -> None:
    sel = (
        client.table("adjudication_results")
        .select("step_trace, notes")
        .eq("claim_id", claim_id)
        .limit(1)
        .execute()
    )
    if not sel.data:
        raise LookupError("No adjudication row for this claim_id.")
    row = sel.data[0]
    st = row.get("step_trace")
    if not isinstance(st, dict):
        st = {}
    st = dict(st)
    st["manual_override"] = {
        "at": datetime.now(timezone.utc).isoformat(),
        "decision": decision,
        "approved_amount": approved_amount,
        "notes": notes,
    }
    upd: dict[str, Any] = {
        "decision": decision,
        "step_trace": st,
    }
    if approved_amount is not None:
        upd["approved_amount"] = approved_amount
    if notes is not None:
        upd["notes"] = notes
    client.table("adjudication_results").update(upd).eq("claim_id", claim_id).execute()
    update_claim_status(client, claim_id, "adjudicated")


def list_claims_dashboard(client: Any, *, limit: int = 200) -> list[dict[str, Any]]:
    """Claims plus latest adjudication row for admin table (avoids PostgREST embed quirks)."""
    claims_res = (
        client.table("claims")
        .select("id, member_id, member_name, treatment_date, claim_amount, status, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    claims = claims_res.data or []
    if not claims:
        return []
    ids = [str(c["id"]) for c in claims]
    adj_res = (
        client.table("adjudication_results")
        .select(
            "claim_id, decision, approved_amount, confidence_score, notes, "
            "rejection_reasons, reasoning, step_trace"
        )
        .in_("claim_id", ids)
        .execute()
    )
    adj_by_claim = {str(a["claim_id"]): a for a in (adj_res.data or [])}
    ext_res = (
        client.table("extracted_data")
        .select("claim_id, raw_ocr_text")
        .in_("claim_id", ids)
        .execute()
    )
    ocr_by_claim: dict[str, str] = {}
    for row in ext_res.data or []:
        cid_e = str(row.get("claim_id", ""))
        txt = row.get("raw_ocr_text")
        ocr_by_claim[cid_e] = (txt or "") if isinstance(txt, str) else ""
    rows: list[dict[str, Any]] = []
    for c in claims:
        cid = str(c["id"])
        a = adj_by_claim.get(cid, {})
        st = a.get("step_trace")
        fraud: list[Any] = []
        if isinstance(st, dict):
            fi = st.get("fraud_indicators")
            if isinstance(fi, list):
                fraud = fi
        rows.append(
            {
                "claim_id": cid,
                "member_id": c.get("member_id"),
                "patient_name": c.get("member_name"),
                "treatment_date": c.get("treatment_date"),
                "claim_amount": c.get("claim_amount"),
                "status": c.get("status"),
                "ai_decision": a.get("decision"),
                "approved_amount": a.get("approved_amount"),
                "confidence_score": a.get("confidence_score"),
                "notes": a.get("notes"),
                "reasoning": a.get("reasoning"),
                "fraud_indicators": fraud,
                "rejection_reasons": a.get("rejection_reasons") or [],
                "created_at": c.get("created_at"),
                "raw_ocr_text": ocr_by_claim.get(cid, ""),
            }
        )
    return rows
