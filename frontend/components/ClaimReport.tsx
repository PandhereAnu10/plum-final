"use client";

import { forwardRef } from "react";
import { ShieldCheck } from "lucide-react";
import type { ClaimReportPayload } from "@/lib/claimReport";
import { cn } from "@/lib/utils";

export type ClaimReportCertificateProps = ClaimReportPayload & {
  /** ISO or display string shown in footer */
  generatedAt?: string;
};

function statusLabel(status: string): string {
  const u = status.toUpperCase();
  if (u === "MANUAL_REVIEW") return "Manual review";
  if (u === "PARTIAL") return "Partial approval";
  return u.replace(/_/g, " ");
}

function decisionBoxClass(status: string): string {
  const u = status.toUpperCase();
  if (u === "APPROVED")
    return "border-emerald-800 bg-emerald-50 text-emerald-950";
  if (u === "REJECTED")
    return "border-red-800 bg-red-50 text-red-950";
  if (u === "PARTIAL")
    return "border-amber-800 bg-amber-50 text-amber-950";
  if (u === "MANUAL_REVIEW")
    return "border-orange-700 bg-orange-50 text-orange-950";
  return "border-zinc-400 bg-zinc-50 text-zinc-900";
}

/**
 * Formal certificate layout for PDF capture — always light “paper” styling
 * (independent of app theme).
 */
export const ClaimReport = forwardRef<HTMLDivElement, ClaimReportCertificateProps>(
  function ClaimReport(
    {
      claimId,
      status,
      claimedDisplay,
      approvedDisplay,
      careNavigatorNotes,
      patientName,
      memberId,
      treatmentDate,
      generatedAt,
    },
    ref,
  ) {
    const stamp =
      generatedAt ??
      new Date().toLocaleString("en-IN", {
        dateStyle: "long",
        timeStyle: "short",
      });

    return (
      <div
        ref={ref}
        className="relative box-border overflow-hidden antialiased"
        style={{
          width: "794px",
          minHeight: "1040px",
          padding: "48px 56px",
          colorScheme: "light",
          backgroundColor: "#ffffff",
          color: "#18181b",
          fontFamily:
            'ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* Watermark */}
        <div
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
          aria-hidden
        >
          <span
            className="text-center text-[52px] font-bold uppercase leading-none tracking-[0.35em] text-[#701a75]/[0.06]"
            style={{ transform: "rotate(-18deg)" }}
          >
            Adjudicated
            <br />
            by AI
          </span>
        </div>

        {/* Header */}
        <header className="relative z-[1] flex items-start justify-between border-b-2 border-[#701a75] pb-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-[#701a75]/30 bg-[#701a75]/5"
              aria-hidden
            >
              <ShieldCheck
                className="h-9 w-9 text-[#701a75]"
                strokeWidth={1.75}
              />
            </div>
            <div>
              <p className="text-2xl font-extrabold tracking-tight text-[#701a75]">
                Plum AI
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Outpatient claims
              </p>
            </div>
          </div>
          <div className="max-w-[280px] text-right">
            <p className="text-[10px] font-bold uppercase leading-snug tracking-[0.28em] text-[#701a75]">
              Official Adjudication Report
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              For member records and reimbursement filing. Not a legal policy
              contract.
            </p>
          </div>
        </header>

        {/* Patient / claim identifiers */}
        <section className="relative z-[1] mt-8">
          <h2 className="mb-4 border-b border-zinc-200 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#701a75]">
            Member &amp; claim information
          </h2>
          <div className="grid grid-cols-2 gap-x-10 gap-y-4 text-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Member name
              </p>
              <p className="mt-1 font-medium text-zinc-900">
                {patientName?.trim() || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Member ID
              </p>
              <p className="mt-1 font-mono font-medium text-zinc-900">
                {memberId?.trim() || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Date of treatment
              </p>
              <p className="mt-1 font-medium text-zinc-900">
                {treatmentDate?.trim() || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Claim ID
              </p>
              <p className="mt-1 break-all font-mono text-xs font-semibold text-zinc-900">
                {claimId}
              </p>
            </div>
          </div>
        </section>

        {/* Decision */}
        <section className="relative z-[1] mt-10">
          <h2 className="mb-4 border-b border-zinc-200 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#701a75]">
            Adjudication decision
          </h2>
          <div
            className={cn(
              "rounded-xl border-2 px-8 py-8 text-center shadow-sm",
              decisionBoxClass(status),
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
              Status
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {statusLabel(status)}
            </p>
            <div className="mt-8 border-t border-black/10 pt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
                Approved amount
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-[#701a75]">
                {approvedDisplay}
              </p>
              <p className="mt-4 text-xs text-zinc-600">
                Amount claimed:{" "}
                <span className="font-mono font-semibold text-zinc-800">
                  {claimedDisplay}
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Care navigator */}
        <section className="relative z-[1] mt-10">
          <h2 className="mb-3 border-b border-zinc-200 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#701a75]">
            Medical necessity &amp; policy notes
          </h2>
          <div className="min-h-[120px] rounded-lg border border-zinc-200 bg-zinc-50/90 px-5 py-4 text-sm leading-relaxed text-zinc-800">
            <p className="whitespace-pre-wrap">
              {careNavigatorNotes.trim() ||
                "No additional clinical or policy narrative was recorded for this adjudication."}
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-[1] mt-12 border-t border-zinc-200 pt-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#701a75]">
            Digitally signed by Plum Adjudication Engine
          </p>
          <p className="mt-2 font-mono text-[11px] text-zinc-500">
            Generated {stamp}
          </p>
          <p className="mt-4 text-[10px] leading-relaxed text-zinc-400">
            Plum Health Insurance · This document summarizes an automated or
            assisted claim review. Retain for your personal health records.
          </p>
        </footer>
      </div>
    );
  },
);

ClaimReport.displayName = "ClaimReport";
