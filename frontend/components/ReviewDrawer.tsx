"use client";

import { useMemo } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { ClaimReportButton } from "@/components/ClaimReportButton";
import { OcrExtractedDisplay } from "@/components/OcrExtractedDisplay";
import { Button } from "@/components/ui/button";
import type { ClaimReportPayload } from "@/lib/claimReport";
import {
  coerceDisplayString,
  formatTreatmentDateForReport,
} from "@/lib/claimReportMeta";
import type { ClaimRow } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function buildReviewReportPayload(
  row: ClaimRow,
  overrideDecision: string,
  overrideAmount: string,
  overrideNotes: string,
): ClaimReportPayload {
  const amtParsed =
    overrideAmount.trim() === ""
      ? NaN
      : parseFloat(overrideAmount.replace(/,/g, ""));
  const approved =
    !Number.isNaN(amtParsed) ? amtParsed : (row.approved_amount ?? null);
  const claimedDisplay =
    row.claim_amount != null && !Number.isNaN(Number(row.claim_amount))
      ? `₹${Number(row.claim_amount).toLocaleString("en-IN")}`
      : "—";
  const approvedDisplay =
    approved != null && !Number.isNaN(Number(approved))
      ? `₹${Number(approved).toLocaleString("en-IN")}`
      : "—";
  const care = [overrideNotes, row.notes, row.reasoning]
    .filter((x): x is string => Boolean(x?.trim()))
    .join("\n\n")
    .trim();
  const tdRaw = coerceDisplayString(row.treatment_date);
  const treatmentDate =
    tdRaw != null
      ? formatTreatmentDateForReport(tdRaw) ?? tdRaw
      : undefined;
  return {
    claimId: row.claim_id,
    status: overrideDecision,
    claimedDisplay,
    approvedDisplay,
    careNavigatorNotes: care || "(No Care Navigator notes.)",
    patientName: coerceDisplayString(row.patient_name),
    memberId: coerceDisplayString(row.member_id),
    treatmentDate,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewRow: ClaimRow | null;
  overrideDecision: string;
  onOverrideDecision: (v: string) => void;
  overrideAmount: string;
  onOverrideAmount: (v: string) => void;
  overrideNotes: string;
  onOverrideNotes: (v: string) => void;
  saving: boolean;
  saveError: string | null;
  onSaveOverride: () => void;
};

export function ReviewDrawer({
  open,
  onOpenChange,
  reviewRow,
  overrideDecision,
  onOverrideDecision,
  overrideAmount,
  onOverrideAmount,
  overrideNotes,
  onOverrideNotes,
  saving,
  saveError,
  onSaveOverride,
}: Props) {
  const reportPayload = useMemo(
    () =>
      reviewRow
        ? buildReviewReportPayload(
            reviewRow,
            overrideDecision,
            overrideAmount,
            overrideNotes,
          )
        : null,
    [
      reviewRow,
      overrideDecision,
      overrideAmount,
      overrideNotes,
    ],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full max-w-full flex-col border-zinc-200/90 p-0 dark:border-white/10 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-zinc-200/90 px-6 py-5 text-left dark:border-white/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <SheetTitle>Human review</SheetTitle>
              <SheetDescription>
                {reviewRow?.patient_name ?? "Member"} · Claim{" "}
                <span className="font-mono text-xs text-[#701a75] dark:text-violet-300/90">
                  {reviewRow?.claim_id?.slice(0, 8)}…
                </span>
              </SheetDescription>
            </div>
            {reportPayload ? (
              <ClaimReportButton
                payload={reportPayload}
                className="w-full shrink-0 sm:w-auto"
              />
            ) : null}
          </div>
        </SheetHeader>

        {reviewRow && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#fff5f7] dark:bg-[#050505]">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#701a75] dark:text-zinc-500">
                  Extracted text
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-600">
                  JSON is cleaned (simulated headers removed) and shown as a
                  grid. Plain text uses a reading-optimized serif face.
                </p>
                <div className="mt-5 max-h-[min(480px,55vh)] overflow-y-auto rounded-xl border border-zinc-200/90 bg-white px-4 py-5 pr-2 dark:border-white/10 dark:bg-[#050505]">
                  <OcrExtractedDisplay raw={reviewRow.raw_ocr_text ?? ""} />
                </div>
              </section>

              <section className="rounded-xl border border-amber-300/60 bg-amber-50/90 p-5 dark:border-amber-500/25 dark:bg-amber-500/10">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-900 dark:text-amber-200/90">
                  <ShieldAlert className="h-4 w-4" />
                  Fraud &amp; integrity
                </h3>
                {(reviewRow.fraud_indicators?.length ?? 0) > 0 ? (
                  <ul className="mt-3 list-inside list-disc space-y-1 text-sm tracking-wide text-amber-950 dark:text-amber-100/90">
                    {(reviewRow.fraud_indicators ?? []).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm tracking-wide text-amber-900/80 dark:text-amber-200/70">
                    No structured fraud flags on this claim.
                  </p>
                )}
                {reviewRow.reasoning && (
                  <p className="mt-4 border-t border-amber-200 pt-4 text-sm leading-relaxed tracking-wide text-amber-950 dark:border-amber-500/20 dark:text-amber-100/85">
                    <span className="font-medium text-amber-950 dark:text-amber-200">
                      Model reasoning:{" "}
                    </span>
                    {reviewRow.reasoning}
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-zinc-200/90 bg-white p-5 dark:border-white/10 dark:bg-zinc-900/40">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[#701a75] dark:text-zinc-400">
                  Manual override
                </h3>
                <p className="mt-1 text-xs tracking-wide text-zinc-600 dark:text-zinc-600">
                  Updates adjudication in Supabase via PATCH.
                </p>
                <label className="mt-5 block text-xs font-medium tracking-wide text-zinc-700 dark:text-zinc-400">
                  Decision
                  <select
                    value={overrideDecision}
                    onChange={(e) => onOverrideDecision(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm tracking-wide text-zinc-900 outline-none ring-[#701a75]/30 focus:ring-2 dark:border-white/10 dark:bg-zinc-950/80 dark:text-zinc-100 dark:ring-violet-500/50"
                  >
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="PARTIAL">Partial pay</option>
                    <option value="MANUAL_REVIEW">Review needed</option>
                  </select>
                </label>
                <label className="mt-4 block text-xs font-medium tracking-wide text-zinc-700 dark:text-zinc-400">
                  Approved amount (₹)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={overrideAmount}
                    onChange={(e) => onOverrideAmount(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm tracking-wide text-zinc-900 outline-none ring-[#701a75]/30 focus:ring-2 dark:border-white/10 dark:bg-zinc-950/80 dark:text-zinc-100 dark:ring-violet-500/50"
                    placeholder="e.g. 1200"
                  />
                </label>
                <label className="mt-4 block text-xs font-medium tracking-wide text-zinc-700 dark:text-zinc-400">
                  Notes (optional)
                  <textarea
                    value={overrideNotes}
                    onChange={(e) => onOverrideNotes(e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm tracking-wide text-zinc-900 outline-none ring-[#701a75]/30 focus:ring-2 dark:border-white/10 dark:bg-zinc-950/80 dark:text-zinc-100 dark:ring-violet-500/50"
                  />
                </label>
              </section>
            </div>

            <div className="shrink-0 border-t border-zinc-200/90 bg-white/90 px-6 py-5 dark:border-white/10 dark:bg-zinc-950/90">
              {saveError && (
                <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
                  {saveError}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => void onSaveOverride()}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Override"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
