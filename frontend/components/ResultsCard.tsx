"use client";

import { useMemo, useEffect, useState, type ReactNode } from "react";
import { ClaimReportButton } from "@/components/ClaimReportButton";
import { PolicyExplainChat } from "@/components/PolicyExplainChat";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import type { ClaimReportPayload } from "@/lib/claimReport";
import {
  formatTreatmentDateForReport,
  pickDisplayString,
} from "@/lib/claimReportMeta";
import type { AdjudicationResult } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatCurrency(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function StatusBadge({ decision }: { decision: string }) {
  const d = decision.toUpperCase();
  const label =
    d === "MANUAL_REVIEW"
      ? "Manual review"
      : d === "PARTIAL"
        ? "Partial"
        : d;

  const base =
    "inline-flex items-center rounded-md px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider";

  if (d === "APPROVED") {
    return (
      <span className={cn(base, "bg-emerald-600 text-white")}>{label}</span>
    );
  }
  if (d === "REJECTED") {
    return <span className={cn(base, "bg-red-600 text-white")}>{label}</span>;
  }
  if (d === "PARTIAL") {
    return (
      <span className={cn(base, "bg-amber-600 text-white")}>{label}</span>
    );
  }
  if (d === "MANUAL_REVIEW") {
    return (
      <span className={cn(base, "bg-orange-600 text-white")}>{label}</span>
    );
  }
  return (
    <span className={cn(base, "bg-zinc-600 text-white dark:bg-zinc-700")}>
      {decision}
    </span>
  );
}

function CareNavigatorNotesReveal({ text }: { text: string }) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!text) {
      setOut("");
      return;
    }
    setOut("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 12);
    return () => window.clearInterval(id);
  }, [text]);
  return (
    <p className="whitespace-pre-wrap text-sm leading-[1.85] text-zinc-700 dark:text-zinc-200">
      {out}
      {text.length > 0 && out.length < text.length ? (
        <span className="ml-0.5 inline-block w-2 animate-pulse text-[#701a75] dark:text-violet-400">
          ▍
        </span>
      ) : null}
    </p>
  );
}

type Props = {
  result: AdjudicationResult;
  claimedAmount: number | null;
  claimContext?: Record<string, unknown>;
  processedAt?: string | null;
  careNavigatorNotesRenderer?: (fullText: string) => ReactNode;
};

export function ResultsCard({
  result,
  claimedAmount,
  claimContext,
  processedAt,
  careNavigatorNotesRenderer,
}: Props) {
  const decision = result.decision?.toUpperCase() ?? "UNKNOWN";
  const conf = result.confidence_score ?? 0;
  const confPct = Math.round(Math.min(1, Math.max(0, conf)) * 100);

  const reasons = result.rejection_reasons ?? [];
  const rejectedItems = result.rejected_items ?? [];
  const fraud = result.fraud_indicators ?? [];

  const memberName = pickDisplayString(
    claimContext?.member_name,
    claimContext?.patient_name,
    result.member_name,
  );
  const memberId = pickDisplayString(
    claimContext?.member_id,
    result.member_id,
  );
  const treatmentRaw = pickDisplayString(
    claimContext?.treatment_date,
    result.treatment_date,
  );
  const treatmentDate =
    treatmentRaw != null
      ? formatTreatmentDateForReport(treatmentRaw) ?? treatmentRaw
      : undefined;

  const careNavigatorText = [result.notes, result.reasoning]
    .filter((x): x is string => Boolean(x?.trim()))
    .join("\n\n")
    .trim();

  const claimLabel = result.claim_id
    ? `Claim #${result.claim_id.slice(0, 8).toUpperCase()}`
    : "Claim";

  const reportPayload: ClaimReportPayload = useMemo(
    () => ({
      claimId: result.claim_id,
      status: decision,
      claimedDisplay: formatCurrency(claimedAmount),
      approvedDisplay: formatCurrency(
        result.approved_amount != null &&
          result.approved_amount !== undefined
          ? Number(result.approved_amount)
          : null,
      ),
      careNavigatorNotes:
        careNavigatorText || "(No Care Navigator notes for this claim.)",
      patientName: memberName,
      memberId,
      treatmentDate,
    }),
    [
      result.claim_id,
      result.approved_amount,
      result.member_name,
      result.member_id,
      result.treatment_date,
      decision,
      claimedAmount,
      careNavigatorText,
      memberName,
      memberId,
      treatmentDate,
      claimContext?.member_name,
      claimContext?.member_id,
      claimContext?.treatment_date,
      claimContext?.patient_name,
    ],
  );

  return (
    <div className="mx-auto w-full max-w-[800px] overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-xl shadow-[#701a75]/[0.12] dark:border-white/10 dark:bg-[#050505] dark:shadow-black/40">
      {/* Header bar */}
      <div className="flex flex-col gap-4 border-b border-zinc-200/90 bg-[#fff5f7] px-6 py-4 dark:border-white/10 dark:bg-zinc-950/80 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {claimLabel}
          </p>
          {memberName && (
            <p className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-500">
              {memberName}
            </p>
          )}
          {processedAt && (
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-600">
              {formatRelativeTime(processedAt)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge decision={decision} />
            {result.fixture_case_id && (
              <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-500">
                {result.fixture_case_id}
              </span>
            )}
          </div>
          <ClaimReportButton
            payload={reportPayload}
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      {/* Body — two columns */}
      <div className="grid grid-cols-1 gap-10 px-6 py-10 md:grid-cols-2 md:gap-12 md:px-8 md:py-10">
        <section className="space-y-6">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#701a75] dark:text-zinc-500">
            Financial summary
          </h3>
          <div>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500">
              Claimed
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
              {formatCurrency(claimedAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500">
              Approved
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
              {formatCurrency(
                result.approved_amount != null &&
                  result.approved_amount !== undefined
                  ? Number(result.approved_amount)
                  : null,
              )}
            </p>
          </div>
          {result.deductions && Object.keys(result.deductions).length > 0 && (
            <div className="border-t border-zinc-200 pt-6 dark:border-white/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#701a75] dark:text-zinc-500">
                Adjustments
              </p>
              <dl className="mt-4 space-y-2">
                {Object.entries(result.deductions).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-4 font-mono text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <dt className="font-sans text-zinc-600 dark:text-zinc-500">
                      {k}
                    </dt>
                    <dd>₹{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#701a75] dark:text-zinc-500">
            Confidence
          </h3>
          <div className="flex items-end gap-3">
            <span className="font-mono text-5xl font-bold tabular-nums leading-none text-zinc-900 dark:text-zinc-50">
              {confPct}
            </span>
            <span className="pb-1.5 text-lg font-medium text-zinc-500 dark:text-zinc-500">
              %
            </span>
          </div>
          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
            Model certainty for this adjudication. Lower scores may warrant
            specialist review.
          </p>
          <div className="pt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:ring-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#701a75] to-purple-500 transition-all duration-500 dark:from-violet-600 dark:to-violet-400"
                style={{ width: `${confPct}%` }}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Footer — Care Navigator Notes */}
      {careNavigatorText ? (
        <div className="border-t border-zinc-200/90 bg-zinc-100/80 px-6 py-8 dark:border-white/10 dark:bg-zinc-900/50 md:px-8">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#701a75] dark:text-zinc-500">
            Care Navigator Notes
          </h3>
          <div className="mt-4">
            {careNavigatorNotesRenderer ? (
              careNavigatorNotesRenderer(careNavigatorText)
            ) : (
              <CareNavigatorNotesReveal
                key={`${result.claim_id}-${careNavigatorText.length}`}
                text={careNavigatorText}
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Secondary sections */}
      <div className="space-y-0 border-t border-zinc-200/90 px-6 py-8 dark:border-white/10 md:px-8">
        {reasons.length > 0 && (
          <section className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#701a75] dark:text-zinc-500">
              Not covered
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-400">
              {reasons.map((r) => (
                <li
                  key={r}
                  className="border-l border-zinc-300 pl-4 dark:border-white/10"
                >
                  {r}
                </li>
              ))}
            </ul>
          </section>
        )}

        {rejectedItems.length > 0 && (
          <section className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#701a75] dark:text-zinc-500">
              Line items set aside
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-400">
              {rejectedItems.map((r) => (
                <li
                  key={r}
                  className="border-l border-zinc-300 pl-4 dark:border-white/10"
                >
                  {r}
                </li>
              ))}
            </ul>
          </section>
        )}

        {result.flags && result.flags.length > 0 && (
          <section className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#701a75] dark:text-zinc-500">
              Flags
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {result.flags.map((f) => (
                <li
                  key={f}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-400"
                >
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}

        {fraud.length > 0 && (
          <section className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#701a75] dark:text-zinc-500">
              Integrity review
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-400">
              {fraud.map((x) => (
                <li
                  key={x}
                  className="border-l border-amber-400/50 pl-4 dark:border-amber-500/30"
                >
                  {x}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div>
          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-600">
            Policy Q&amp;A is grounded in your policy document and this claim
            only.
          </p>
          <div className="mt-6">
            <PolicyExplainChat result={result} claimContext={claimContext} />
          </div>
        </div>
      </div>
    </div>
  );
}
