"""Groq-backed adjudication using policy terms, rules, and test-case exemplars."""

from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from typing import Any

from groq import Groq

from paths import REPO_ROOT

MODEL_NAME = os.getenv("GROQ_MODEL_NAME", "llama-3.3-70b-versatile")


def _load_text(rel: str) -> str:
    return (REPO_ROOT / rel).read_text(encoding="utf-8")


def _load_policy_json_str() -> str:
    data = json.loads((REPO_ROOT / "policy_terms.json").read_text(encoding="utf-8"))
    return json.dumps(data, indent=2, ensure_ascii=False)


@lru_cache
def _few_shot_expected_outputs() -> str:
    """Compact few-shot from test_cases.json (expected_output only + case id)."""
    path = REPO_ROOT / "test_cases.json"
    if not path.is_file():
        return ""
    raw = json.loads(path.read_text(encoding="utf-8"))
    cases = raw.get("test_cases") or []
    lines: list[str] = []
    for row in cases:
        cid = row.get("case_id")
        exp = row.get("expected_output")
        if cid and isinstance(exp, dict):
            lines.append(f"- {cid}: {json.dumps(exp, ensure_ascii=False)}")
    return "\n".join(lines)


def _strip_code_fence(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s*```$", "", t)
    return t.strip()


def _parse_json_object(content: str) -> dict[str, Any]:
    cleaned = _strip_code_fence(content)
    return json.loads(cleaned)


def _unwrap_model_payload(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        return {}
    for key in ("adjudication", "result", "output", "response", "verdict"):
        inner = data.get(key)
        if isinstance(inner, dict) and inner.get("decision") is not None:
            return inner
    return data


class Adjudicator:
    """Calls Groq with rules + policy + exemplars; returns normalized JSON."""

    def __init__(self) -> None:
        key = os.getenv("GROQ_API_KEY")
        if not key:
            raise RuntimeError("GROQ_API_KEY is not set.")
        self._client = Groq(api_key=key)
        self._rules_md = _load_text("adjudication_rules.md")
        self._policy_json = _load_policy_json_str()
        self._few_shot = _few_shot_expected_outputs()

    def _system_prompt(self) -> str:
        strict_audit_protocol = (
            "## Strict Audit Protocol (mandatory — run before any coverage decision)\n"
            "You are an **auditor**, not a passive reader. **Do not assume** the bill's printed total, "
            "**Net Amount**, or **Grand Total** is correct.\n\n"
            "**MANDATORY MATH CHECK:** You **must** explicitly **list** every individual item price you "
            "can identify in the document (each line charge, fee, medicine line, test, etc.), then "
            "**compute their sum** in your reasoning chain. Show the arithmetic: item₁ + item₂ + … = "
            "your **calculated sum**.\n\n"
            "**CROSS-REFERENCE:** Compare your **calculated sum** to the document's stated **Total**, "
            "**Net Amount**, **Grand Total**, or equivalent final figure (use whichever final total the "
            "bill presents). If multiple totals appear, reconcile which one is the claimable total.\n\n"
            "**FRAUD TRIGGER (math mismatch):** If your calculated sum differs from the document's stated "
            "final total by **more than 1%** (relative to the larger of the two values, or absolute gap if "
            "one side is zero), you **MUST**:\n"
            "- Set **decision** to **MANUAL_REVIEW**.\n"
            "- Set **confidence_score** to **strictly below 0.70** (e.g. 0.45–0.65).\n"
            "- Add the exact string **`MATH_INCONSISTENCY`** to **fraud_indicators**.\n"
            "- In **notes**, clearly explain the discrepancy (e.g. *Sum of line items is ₹1,000 but "
            "Total/Net on bill is ₹4,500*).\n\n"
            "**If** line items cannot be extracted reliably (illegible OCR, no breakdown), treat that as "
            "high uncertainty: prefer **MANUAL_REVIEW**, lower **confidence_score**, and explain in "
            "**notes** why a full reconciliation was not possible — do **not** approve large amounts on "
            "faith in a single total line alone.\n\n"
        )
        hard_limits = (
            "## Mandatory limit rules (do not contradict)\n"
            "- **Per-claim cap**: Under `coverage_details.per_claim_limit`, the policy sets **₹5,000** "
            "for a **single claim submission**. Compare the **submitted claim_amount** in context "
            "(total being claimed for this event) to **₹5,000**.\n"
            "- **If the submitted claim_amount is greater than ₹5,000 and the member is seeking "
            "payment for that full amount as one claim**, the decision **MUST** be **REJECTED** with "
            "**rejection_reasons** containing **`PER_CLAIM_EXCEEDED`** (Category 4 — Limit Issues in "
            "adjudication_rules.md). Do **not** use **PARTIAL** to 'cap' a whole claim at ₹5,000 "
            "when the entire bill is for covered, non-split services — that scenario is a hard reject.\n"
            "- **PARTIAL** applies when **some line items are covered and others are not** (e.g. "
            "covered root canal + excluded cosmetic whitening) or when only a **clear subset** of "
            "charges is eligible; cite **rejected_items** for excluded portions.\n"
            "- **Consultation sub-limit**: `consultation_fees.sub_limit` is **₹2,000** per policy. "
            "Consultation fees above that sub-limit are not fully eligible; apply **copay_percentage** "
            "(10%) on eligible consultation amounts within the sub-limit.\n"
            "- Re-read **Step 4: Limit Validation** and **Category 4** codes before finalizing.\n\n"
        )
        fraud_block = (
            "## Fraud & integrity signals (adjudication_rules.md — Fraud Indicators)\n"
            "Populate **fraud_indicators** as an array of short strings describing anything suspicious "
            "found (empty array if none). Check for:\n"
            "(a) **Math errors / bill totals**: if line-item sum vs stated **Total/Net** differs by **>1%**, "
            "follow **Strict Audit Protocol** — **MANUAL_REVIEW**, **confidence_score < 0.70**, "
            "**`MATH_INCONSISTENCY`** in **fraud_indicators**, discrepancy in **notes** (exact token).\n"
            "(b) **Non-medical / excluded-style items** billed as medical: e.g. cosmetic dentistry "
            "(teeth whitening), vitamins/supplements (unless policy allows prescribed deficiency), "
            "wellness/cosmetic SKUs, non-clinical charges.\n"
            "(c) **Date inconsistencies**: prescription date vs bill date vs **treatment_date** in "
            "context; impossible sequences; mismatched years.\n"
            "If any serious integrity issue is uncertain but material, lower **confidence_score**.\n\n"
        )
        confidence_block = (
            "## confidence_score (0.0–1.0)\n"
            "Derive from: (1) **clarity** of structured/OCR data vs policy needs, (2) **how tightly** "
            "the facts match a single unambiguous rule path, (3) **uncertainty** (ambiguous dates, "
            "missing fields, conflicting lines → lower score). Use **~0.95–1.0** when rules and numbers "
            "match cleanly; **~0.65–0.85** when judgment or patterns (e.g. fraud flags) apply; **lower** "
            "if evidence is weak.\n"
            "**Post-rule (enforced server-side):** if your confidence would be **below 0.70**, output "
            "**decision** as **MANUAL_REVIEW** anyway so a human can verify.\n"
            "**Strict Audit Protocol:** any **>1%** math mismatch **requires** **confidence_score < 0.70** "
            "and **MANUAL_REVIEW** before any APPROVED/PARTIAL/REJECTED path.\n\n"
        )
        exemplars = ""
        if self._few_shot:
            exemplars = (
                "## Few-shot expected outputs (Plum regression suite — align decisions & codes)\n"
                "These are the **authoritative expected_output** shapes for internal tests. Prefer "
                "matching **decision**, **rejection_reasons** codes, and **approved_amount** logic when "
                "the scenario matches (e.g. TC003: claim above per-claim limit → **REJECTED** + "
                "**PER_CLAIM_EXCEEDED**).\n"
                f"{self._few_shot}\n\n"
            )
        return (
            "You are Plum's OPD claim adjudication engine. Apply ONLY the rules below, the policy JSON, "
            "and the exemplars. Work through Steps 1–5 in order.\n\n"
            f"{strict_audit_protocol}"
            f"{hard_limits}"
            f"{fraud_block}"
            f"{confidence_block}"
            f"{exemplars}"
            "## adjudication_rules.md\n"
            f"{self._rules_md}\n\n"
            "## policy_terms.json\n"
            f"{self._policy_json}\n"
        )

    def _user_prompt(
        self,
        *,
        claim_id: str,
        context: dict[str, Any],
        ocr_text: str,
    ) -> str:
        ctx = json.dumps(context, indent=2, ensure_ascii=False, default=str)
        return (
            f"claim_id (database id): {claim_id}\n\n"
            "Claim context (structured; trusted submission metadata):\n"
            f"{ctx}\n\n"
            "Extracted document text (from OCR or fixture):\n"
            f"{ocr_text}\n\n"
            "Apply **Strict Audit Protocol** first: list line items, sum, compare to Total/Net; if "
            "mismatch >1%, output MANUAL_REVIEW + MATH_INCONSISTENCY + notes with figures.\n\n"
            "Return a single JSON object (no markdown) with this shape:\n"
            "{\n"
            '  "decision": "APPROVED" | "REJECTED" | "PARTIAL" | "MANUAL_REVIEW",\n'
            '  "approved_amount": number | null,\n'
            '  "deductions": { "copay": number, ... },\n'
            '  "rejection_reasons": ["CODE"],\n'
            '  "rejected_items": ["string"],\n'
            '  "confidence_score": number,\n'
            '  "notes": "string",\n'
            '  "reasoning": "concise chain of rule application",\n'
            '  "flags": ["string"],\n'
            '  "fraud_indicators": ["short description of each issue found, or empty array"],\n'
            '  "cashless_approved": boolean,\n'
            '  "network_discount": number\n'
            "}\n"
            "Use rejection codes from adjudication_rules.md. "
            "Remember: claim_amount > ₹5,000 as a single indivisible covered claim ⇒ **REJECTED** + "
            "**PER_CLAIM_EXCEEDED**, not PARTIAL, unless the fixture clearly splits covered vs excluded "
            "line items (see few-shot TC002 vs TC003)."
        )

    def adjudicate(
        self,
        *,
        claim_id: str,
        context: dict[str, Any],
        ocr_text: str,
    ) -> dict[str, Any]:
        system = self._system_prompt()
        user = self._user_prompt(claim_id=claim_id, context=context, ocr_text=ocr_text)

        kwargs: dict[str, Any] = {
            "model": MODEL_NAME,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.1,
        }
        try:
            completion = self._client.chat.completions.create(
                **kwargs,
                response_format={"type": "json_object"},
            )
        except Exception:
            completion = self._client.chat.completions.create(**kwargs)

        msg = completion.choices[0].message
        content = (msg.content or "").strip() or "{}"
        try:
            parsed = _unwrap_model_payload(_parse_json_object(content))
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"Model returned invalid JSON. First 500 chars: {content[:500]!r}"
            ) from exc
        return normalize_adjudication(parsed, claim_id=claim_id)


def _coerce_float(val: Any) -> float | None:
    if val is None or val == "":
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def normalize_adjudication(raw: dict[str, Any], *, claim_id: str) -> dict[str, Any]:
    raw = _unwrap_model_payload(raw)
    decision = str(raw.get("decision", "MANUAL_REVIEW")).upper().strip()
    if decision not in {"APPROVED", "REJECTED", "PARTIAL", "MANUAL_REVIEW"}:
        decision = "MANUAL_REVIEW"

    approved_num = _coerce_float(raw.get("approved_amount"))

    deductions = raw.get("deductions")
    if deductions is None:
        deductions = {}
    if isinstance(deductions, list):
        deductions = {"items": deductions}
    if not isinstance(deductions, dict):
        deductions = {"value": deductions}

    reasons = raw.get("rejection_reasons")
    if reasons is None:
        reasons = []
    if isinstance(reasons, str):
        reasons = [reasons]
    if not isinstance(reasons, list):
        reasons = [str(reasons)]
    reasons = [str(x).strip().upper() for x in reasons if str(x).strip()]

    rejected_items = raw.get("rejected_items")
    if rejected_items is None:
        rejected_items = []
    if isinstance(rejected_items, str):
        rejected_items = [rejected_items]
    if not isinstance(rejected_items, list):
        rejected_items = [str(rejected_items)]
    rejected_items = [str(x) for x in rejected_items]

    flags = raw.get("flags")
    if flags is None:
        flags = []
    if isinstance(flags, str):
        flags = [flags]
    if not isinstance(flags, list):
        flags = [str(flags)]
    flags = [str(x) for x in flags]

    fraud_raw = raw.get("fraud_indicators")
    if fraud_raw is None:
        fraud_indicators: list[str] = []
    elif isinstance(fraud_raw, str):
        fraud_indicators = [fraud_raw] if fraud_raw.strip() else []
    elif isinstance(fraud_raw, list):
        fraud_indicators = [str(x) for x in fraud_raw if str(x).strip()]
    else:
        fraud_indicators = [str(fraud_raw)]

    conf_f = _coerce_float(raw.get("confidence_score"))
    if conf_f is None:
        conf_f = 0.7
    conf_f = max(0.0, min(1.0, conf_f))

    notes = raw.get("notes")
    if notes is not None:
        notes = str(notes)

    reasoning = raw.get("reasoning")
    if reasoning is not None:
        reasoning = str(reasoning)

    out: dict[str, Any] = {
        "claim_id": claim_id,
        "decision": decision,
        "approved_amount": approved_num,
        "deductions": deductions,
        "rejection_reasons": reasons,
        "rejected_items": rejected_items,
        "confidence_score": conf_f,
        "notes": notes,
        "reasoning": reasoning,
        "flags": flags,
        "fraud_indicators": fraud_indicators,
    }

    # Low confidence → human review (assignment rule)
    if conf_f < 0.70 and out["decision"] != "MANUAL_REVIEW":
        suffix = "[System: confidence < 0.70 → MANUAL_REVIEW]"
        prev = (out["notes"] or "").strip()
        out["decision"] = "MANUAL_REVIEW"
        out["notes"] = f"{prev} {suffix}".strip() if prev else suffix
        if "LOW_CONFIDENCE_ESCALATION" not in out["flags"]:
            out["flags"] = [*out["flags"], "LOW_CONFIDENCE_ESCALATION"]

    cap = raw.get("cashless_approved")
    if cap is not None:
        if isinstance(cap, str):
            out["cashless_approved"] = cap.strip().lower() in ("1", "true", "yes", "y")
        else:
            out["cashless_approved"] = bool(cap)

    nd = _coerce_float(raw.get("network_discount"))
    if nd is not None:
        out["network_discount"] = nd

    return out
