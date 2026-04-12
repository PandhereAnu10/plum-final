export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AdjudicationResult = {
  claim_id: string;
  decision: string;
  approved_amount?: number | null;
  deductions?: Record<string, unknown>;
  rejection_reasons?: string[];
  rejected_items?: string[];
  confidence_score?: number;
  notes?: string | null;
  reasoning?: string | null;
  flags?: string[];
  fraud_indicators?: string[];
  fixture_case_id?: string;
  case_name?: string;
  /** Echoed from claim intake for reports (POST /claims and test fixtures). */
  member_id?: string | null;
  member_name?: string | null;
  treatment_date?: string | null;
};

export type ClaimRow = {
  claim_id: string;
  member_id?: string;
  patient_name?: string;
  treatment_date?: string;
  claim_amount?: number;
  status?: string;
  ai_decision?: string | null;
  approved_amount?: number | null;
  confidence_score?: number | null;
  notes?: string | null;
  reasoning?: string | null;
  fraud_indicators?: string[];
  rejection_reasons?: string[];
  created_at?: string;
  /** Raw OCR text from extracted_data (admin review). */
  raw_ocr_text?: string;
};

export async function patchClaimAdjudication(
  claimId: string,
  body: { decision: string; approved_amount?: number | null; notes?: string | null },
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/v1/claims/${encodeURIComponent(claimId)}/adjudication`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: body.decision,
        approved_amount: body.approved_amount ?? undefined,
        notes: body.notes ?? undefined,
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail ?? data),
    );
  }
}

export async function postPolicyChat(body: {
  question: string;
  claim_context?: Record<string, unknown>;
  adjudication_snapshot?: Record<string, unknown>;
}): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/chat/policy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail ?? data),
    );
  }
  return String((data as { answer?: string }).answer ?? "");
}
