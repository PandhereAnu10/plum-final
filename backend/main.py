import os
import traceback
from typing import Any, Optional

import ocr_service
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.adjudicator import Adjudicator
from services.policy_chat import answer_policy_question
from supabase_store import (
    fetch_policy_id,
    get_supabase,
    insert_adjudication_result,
    insert_claim,
    insert_claim_document,
    insert_extracted_data,
    list_claims_dashboard,
    patch_adjudication_by_claim_id,
    update_claim_status,
)
from test_case_loader import get_case_by_id, mock_documents_as_text

load_dotenv()

app = FastAPI(title="Plum OPD Claim Adjudication API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _parse_amount(value: Optional[str], *, field: str) -> float:
    if value is None or str(value).strip() == "":
        raise HTTPException(status_code=422, detail=f"{field} is required")
    try:
        return float(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=422, detail=f"{field} must be a number"
        ) from exc


def _run_claim_pipeline(
    sb: Any,
    *,
    policy: str,
    member_id: str,
    member_name: str,
    treatment_date: str,
    claim_amt: float,
    ocr_text: str,
    structured: dict[str, Any],
    mock_row: Optional[dict[str, Any]],
    upload_name: Optional[str],
    upload_mime: Optional[str],
    from_path_test: bool = False,
) -> dict[str, Any]:
    """Persist claim → document → extracted_data → adjudicate → adjudication_results."""
    policy_id = fetch_policy_id(sb, policy)

    metadata: dict[str, Any] = {"pipeline": "v1", "policy_code": policy}
    if mock_row:
        metadata["source"] = (
            "path_test" if from_path_test else "mock_fixture"
        )
        metadata["case_id"] = mock_row["case_id"]
        metadata["case_name"] = mock_row.get("case_name")
    else:
        metadata["source"] = "upload"
        metadata["original_filename"] = upload_name
        metadata["content_type"] = upload_mime

    claim_uuid = insert_claim(
        sb,
        policy_id=policy_id,
        member_id=member_id,
        member_name=member_name,
        treatment_date=treatment_date,
        claim_amount=claim_amt,
        status="processing",
        metadata=metadata,
    )

    if mock_row:
        insert_claim_document(
            sb,
            claim_id=claim_uuid,
            doc_type="fixture",
            storage_path=f"mock://{mock_row['case_id']}",
            mime_type="application/x-plum-test-case",
        )
    else:
        assert upload_name is not None
        insert_claim_document(
            sb,
            claim_id=claim_uuid,
            doc_type="submission",
            storage_path=f"upload://{claim_uuid}/{upload_name}",
            mime_type=upload_mime,
        )

    insert_extracted_data(
        sb,
        claim_id=claim_uuid,
        raw_ocr_text=ocr_text,
        structured=structured,
        model="tesseract" if not mock_row else "fixture",
        extraction_version=None,
    )

    try:
        engine = Adjudicator()
    except RuntimeError as exc:
        update_claim_status(sb, claim_uuid, "failed")
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    context: dict[str, Any] = {
        "member_id": member_id,
        "member_name": member_name,
        "treatment_date": treatment_date,
        "claim_amount": claim_amt,
        "policy_code": policy,
    }
    if mock_row:
        context["fixture_case_id"] = mock_row["case_id"]
        context["fixture_description"] = mock_row.get("description")
        context["input_data"] = mock_row["input_data"]

    try:
        result = engine.adjudicate(
            claim_id=claim_uuid,
            context=context,
            ocr_text=ocr_text or "(no text extracted)",
        )
    except Exception as exc:
        update_claim_status(sb, claim_uuid, "failed")
        raise HTTPException(
            status_code=502, detail=f"Adjudication failed: {exc}"
        ) from exc

    insert_adjudication_result(sb, claim_id=claim_uuid, payload=result)
    final_status = (
        "manual_review"
        if str(result.get("decision", "")).upper() == "MANUAL_REVIEW"
        else "adjudicated"
    )
    update_claim_status(sb, claim_uuid, final_status)

    out = dict(result)
    if mock_row:
        out["fixture_case_id"] = mock_row["case_id"]
        out["case_name"] = mock_row.get("case_name")
    # Echo intake fields for clients (PDF / UI) without a separate claim fetch.
    out["member_id"] = member_id
    out["member_name"] = member_name
    out["treatment_date"] = treatment_date
    return out


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/claims")
def list_claims() -> dict[str, Any]:
    """Admin: all claims with adjudication summary for dashboard table."""
    try:
        sb = get_supabase()
    except Exception as exc:
        print(f"[get_supabase] FAILED: {type(exc).__name__}: {exc}", flush=True)
        traceback.print_exc()
        raise HTTPException(
            status_code=503,
            detail=f"Supabase client failed: {type(exc).__name__}: {exc}",
        ) from exc
    try:
        rows = list_claims_dashboard(sb)
    except Exception as exc:
        print(f"[list_claims] FAILED: {exc}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"claims": rows}


class AdjudicationPatchBody(BaseModel):
    decision: str = Field(..., min_length=1)
    approved_amount: Optional[float] = None
    notes: Optional[str] = None


@app.patch("/api/v1/claims/{claim_id}/adjudication")
def patch_claim_adjudication(claim_id: str, body: AdjudicationPatchBody) -> dict[str, Any]:
    decision = body.decision.strip().upper()
    if decision not in {"APPROVED", "REJECTED", "PARTIAL", "MANUAL_REVIEW"}:
        raise HTTPException(
            status_code=422,
            detail="decision must be APPROVED, REJECTED, PARTIAL, or MANUAL_REVIEW",
        )
    try:
        sb = get_supabase()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Supabase client failed: {type(exc).__name__}: {exc}",
        ) from exc
    try:
        patch_adjudication_by_claim_id(
            sb,
            claim_id=claim_id,
            decision=decision,
            approved_amount=body.approved_amount,
            notes=body.notes,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"ok": True, "claim_id": claim_id, "decision": decision}


class PolicyChatBody(BaseModel):
    question: str = Field(..., min_length=1)
    claim_context: Optional[dict[str, Any]] = None
    adjudication_snapshot: Optional[dict[str, Any]] = None


@app.post("/api/v1/chat/policy")
def policy_chat(body: PolicyChatBody) -> dict[str, str]:
    try:
        answer = answer_policy_question(
            question=body.question,
            claim_context=body.claim_context,
            adjudication_snapshot=body.adjudication_snapshot,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"answer": answer}


@app.post("/api/v1/claims/test/{case_id}")
def run_test_case_adjudication(case_id: str) -> dict[str, Any]:
    """
    Load test_cases.json fixture, adjudicate, and **persist** to Supabase (same as main flow)
    so rows appear on the Admin dashboard.
    """
    print("--- TEST FIXTURE CLAIM (with DB persist) ---", flush=True)
    try:
        mock_row = get_case_by_id(case_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    inp = mock_row["input_data"]
    member_id = str(inp["member_id"])
    member_name = str(inp["member_name"])
    treatment_date = str(inp["treatment_date"])
    claim_amt = float(inp["claim_amount"])
    policy = (os.getenv("DEFAULT_POLICY_CODE") or "PLUM_OPD_2024").strip()
    ocr_text = mock_documents_as_text(inp)
    structured = {
        "source": "test_fixture",
        "case_id": mock_row["case_id"],
        "input_data": inp,
    }
    try:
        sb = get_supabase()
    except Exception as exc:
        print(f"[get_supabase] FAILED: {type(exc).__name__}: {exc}", flush=True)
        traceback.print_exc()
        raise HTTPException(
            status_code=503,
            detail=f"Supabase client failed: {type(exc).__name__}: {exc}",
        ) from exc

    try:
        return _run_claim_pipeline(
            sb,
            policy=policy,
            member_id=member_id,
            member_name=member_name,
            treatment_date=treatment_date,
            claim_amt=claim_amt,
            ocr_text=ocr_text,
            structured=structured,
            mock_row=mock_row,
            upload_name=None,
            upload_mime=None,
            from_path_test=True,
        )
    except HTTPException:
        raise
    except LookupError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/v1/claims")
async def create_and_adjudicate_claim(
    member_id: Optional[str] = Form(None),
    member_name: Optional[str] = Form(None),
    treatment_date: Optional[str] = Form(None),
    claim_amount: Optional[str] = Form(None),
    policy_code: Optional[str] = Form(None),
    case_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
) -> dict[str, Any]:
    """
    Full pipeline: claim row -> document row -> OCR (upload) or fixture text (form case_id) ->
    extracted_data -> Adjudicator -> adjudication_results.
    """
    print("--- NEW CLAIM REQUEST RECEIVED ---", flush=True)
    use_mock = bool(case_id and case_id.strip())
    mock_row: Optional[dict[str, Any]] = None
    ocr_text = ""
    structured: dict[str, Any] = {}
    upload_name: Optional[str] = None
    upload_mime: Optional[str] = None

    if use_mock:
        try:
            mock_row = get_case_by_id(case_id.strip())  # type: ignore[union-attr]
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except FileNotFoundError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        inp = mock_row["input_data"]
        member_id = str(inp["member_id"])
        member_name = str(inp["member_name"])
        treatment_date = str(inp["treatment_date"])
        claim_amt = float(inp["claim_amount"])
        ocr_text = mock_documents_as_text(inp)
        structured = {
            "source": "test_fixture",
            "case_id": mock_row["case_id"],
            "input_data": inp,
        }
    else:
        if file is None:
            raise HTTPException(
                status_code=422,
                detail="Provide either case_id (mock) or a file upload.",
            )
        if not member_id or not member_name or not treatment_date:
            raise HTTPException(
                status_code=422,
                detail="member_id, member_name, and treatment_date are required for file uploads.",
            )
        claim_amt = _parse_amount(claim_amount, field="claim_amount")
        upload_bytes = await file.read()
        if not upload_bytes:
            raise HTTPException(status_code=400, detail="Empty file upload.")
        upload_name = file.filename
        upload_mime = file.content_type
        try:
            ocr_text = ocr_service.extract_text_from_image(upload_bytes)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        structured = {
            "source": "ocr",
            "filename": upload_name,
            "content_type": upload_mime,
            "ocr_char_count": len(ocr_text),
            "ocr_preview": ocr_text[:4000],
        }

    policy = (policy_code or os.getenv("DEFAULT_POLICY_CODE") or "PLUM_OPD_2024").strip()

    try:
        sb = get_supabase()
    except Exception as exc:
        print(f"[get_supabase] FAILED: {type(exc).__name__}: {exc}", flush=True)
        traceback.print_exc()
        raise HTTPException(
            status_code=503,
            detail=f"Supabase client failed: {type(exc).__name__}: {exc}",
        ) from exc

    try:
        return _run_claim_pipeline(
            sb,
            policy=policy,
            member_id=member_id,
            member_name=member_name,
            treatment_date=treatment_date,
            claim_amt=claim_amt,
            ocr_text=ocr_text,
            structured=structured,
            mock_row=mock_row,
            upload_name=upload_name,
            upload_mime=upload_mime,
        )
    except HTTPException:
        raise
    except LookupError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
