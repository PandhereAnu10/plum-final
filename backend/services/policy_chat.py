"""Policy Q&A using only policy_terms.json + user-provided claim context."""

from __future__ import annotations

import json
import os
from typing import Any

from groq import Groq

from paths import REPO_ROOT

MODEL_NAME = os.getenv("GROQ_MODEL_NAME", "llama-3.3-70b-versatile")


def _policy_text() -> str:
    return (REPO_ROOT / "policy_terms.json").read_text(encoding="utf-8")


def answer_policy_question(
    *,
    question: str,
    claim_context: dict[str, Any] | None = None,
    adjudication_snapshot: dict[str, Any] | None = None,
) -> str:
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise RuntimeError("GROQ_API_KEY is not set.")
    client = Groq(api_key=key)

    extra = ""
    if claim_context is not None:
        extra += "\n## Claim context (this submission only)\n"
        extra += json.dumps(claim_context, indent=2, ensure_ascii=False, default=str)
    if adjudication_snapshot is not None:
        extra += "\n## AI adjudication snapshot for this claim\n"
        extra += json.dumps(adjudication_snapshot, indent=2, ensure_ascii=False, default=str)

    system = (
        "You are a Plum OPD policy assistant. Answer ONLY using the policy JSON below and the "
        "optional claim/adjudication context. If the answer is not supported by the policy text, "
        "say you cannot find it in the policy. Be concise and professional. Do not invent limits "
        "or benefits not in the policy.\n\n"
        "## policy_terms.json\n"
        f"{_policy_text()}"
        f"{extra}"
    )
    completion = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": question.strip()},
        ],
        temperature=0.2,
        max_tokens=1024,
    )
    return (completion.choices[0].message.content or "").strip()
