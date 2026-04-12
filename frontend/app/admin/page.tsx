"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { PatientAvatar } from "@/components/PatientAvatar";
import { ReviewDrawer } from "@/components/ReviewDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import {
  API_BASE,
  patchClaimAdjudication,
  type ClaimRow,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatMoney(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function workflowStatusBadge(status: string | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "adjudicated")
    return {
      label: "Filed",
      variant: "muted" as const,
      className:
        "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-zinc-800/90 dark:text-zinc-200",
    };
  if (s === "manual_review")
    return {
      label: "Needs review",
      variant: "warning" as const,
      className: "",
    };
  if (s === "failed")
    return { label: "Failed", variant: "danger" as const, className: "" };
  if (s === "processing")
    return {
      label: "Processing",
      variant: "muted" as const,
      className:
        "border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
    };
  return { label: status ?? "—", variant: "muted" as const, className: "" };
}

/** Compact solid pills for the data grid — no gradients or glow */
function AiOutcomePill({ decision }: { decision: string | null | undefined }) {
  const d = (decision ?? "").toUpperCase();
  if (d === "APPROVED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-900/60 bg-emerald-800 px-2.5 py-0.5 text-[11px] font-medium text-white">
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        Approved
      </span>
    );
  if (d === "REJECTED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-900/60 bg-red-800 px-2.5 py-0.5 text-[11px] font-medium text-white">
        <XCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
        Rejected
      </span>
    );
  if (d === "MANUAL_REVIEW")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-900/60 bg-amber-800 px-2.5 py-0.5 text-[11px] font-medium text-white">
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
        Review needed
      </span>
    );
  if (d === "PARTIAL")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-900/60 bg-amber-800 px-2.5 py-0.5 text-[11px] font-medium text-white">
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
        Partial pay
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
      {decision ?? "—"}
    </span>
  );
}

function computeDashboardStats(rows: ClaimRow[]) {
  const total = rows.length;
  const autoApproved = rows.filter(
    (r) => (r.ai_decision ?? "").toUpperCase() === "APPROVED",
  ).length;
  const autoApprovalPct = total
    ? Math.round((autoApproved / total) * 1000) / 10
    : 0;
  let claimSavings = 0;
  for (const r of rows) {
    const claimed = Number(r.claim_amount ?? 0);
    const approved = Number(r.approved_amount ?? 0);
    if (!Number.isNaN(claimed)) {
      const ap = Number.isNaN(approved) ? 0 : approved;
      claimSavings += Math.max(0, claimed - ap);
    }
  }
  return { total, autoApprovalPct, claimSavings };
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-zinc-100 dark:divide-white/5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-5">
          <div className="h-11 w-11 shrink-0 rounded-full plum-shimmer" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-40 max-w-full rounded-md plum-shimmer" />
            <div className="h-2.5 w-24 max-w-full rounded-md plum-shimmer opacity-80" />
          </div>
          <div className="hidden h-3 w-16 rounded-md plum-shimmer sm:block" />
          <div className="h-7 w-24 shrink-0 rounded-full plum-shimmer" />
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reviewRow, setReviewRow] = useState<ClaimRow | null>(null);
  const [overrideAmount, setOverrideAmount] = useState("");
  const [overrideDecision, setOverrideDecision] = useState("APPROVED");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Welcome back");

  const stats = useMemo(() => computeDashboardStats(rows), [rows]);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening",
    );
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/claims`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Failed to load claims",
        );
      }
      setRows((data.claims as ClaimRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openReview = (r: ClaimRow) => {
    setReviewRow(r);
    setOverrideAmount(
      r.approved_amount != null ? String(r.approved_amount) : "",
    );
    setOverrideDecision(
      r.ai_decision && r.ai_decision.trim()
        ? r.ai_decision.toUpperCase()
        : "APPROVED",
    );
    setOverrideNotes(r.notes ?? "");
    setSaveError(null);
    setSheetOpen(true);
  };

  const saveOverride = async () => {
    if (!reviewRow) return;
    setSaving(true);
    setSaveError(null);
    const claimId = reviewRow.claim_id;
    const amtParsed =
      overrideAmount.trim() === ""
        ? undefined
        : parseFloat(overrideAmount.replace(/,/g, ""));
    const amt =
      amtParsed !== undefined && !Number.isNaN(amtParsed)
        ? amtParsed
        : undefined;
    try {
      await patchClaimAdjudication(claimId, {
        decision: overrideDecision,
        approved_amount: amt,
        notes: overrideNotes,
      });
      toast.success("Decision Updated");
      setSheetOpen(false);
      setReviewRow(null);
      void load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const hasFraud = (r: ClaimRow) => (r.fraud_indicators?.length ?? 0) > 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto max-w-6xl bg-[#fff5f7] pb-24 dark:bg-[#050505]">
        <div className="mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#701a75] dark:text-zinc-500">
              Claims command center
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl sm:leading-[1.1]">
              {greeting},
              <span className="block text-xl font-medium tracking-wide text-zinc-600 dark:text-zinc-500 sm:text-3xl">
                Live operations overview
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed tracking-wide text-zinc-600 dark:text-zinc-500">
              Triage OPD claims with AI context, OCR, and human overrides — all
              in one midnight console built for volume and precision.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => load()}
            disabled={loading}
            className="h-11 w-full shrink-0 px-5 sm:w-auto"
          >
            <RefreshCw
              className={cn("h-4 w-4", loading && "animate-spin")}
            />
            Refresh queue
          </Button>
        </div>

        <div className="mb-10 grid grid-cols-1 items-stretch gap-4 sm:mb-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          <Card>
            <div className="flex min-h-[180px] flex-col px-6 py-7 sm:min-h-[200px] sm:px-8 sm:py-8">
              <div className="space-y-1.5">
                <CardTitle>Queue depth</CardTitle>
                <CardDescription>Claims on record in Plum</CardDescription>
              </div>
              <div className="mt-8">
                <p className="font-mono text-3xl font-semibold leading-none tracking-tight text-[#701a75] tabular-nums dark:text-white sm:text-5xl">
                  {stats.total}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
                  Total submissions ingested
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex min-h-[180px] flex-col px-6 py-7 sm:min-h-[200px] sm:px-8 sm:py-8">
              <div className="space-y-1.5">
                <CardTitle>Straight-through rate</CardTitle>
                <CardDescription>AI-approved without human queue</CardDescription>
              </div>
              <div className="mt-8">
                <p className="font-mono text-3xl font-semibold leading-none tracking-tight text-[#701a75] tabular-nums dark:text-white sm:text-5xl">
                  {stats.total ? `${stats.autoApprovalPct}%` : "—"}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
                  Share with decision Approved
                </p>
              </div>
            </div>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <div className="flex min-h-[180px] flex-col px-6 py-7 sm:min-h-[200px] sm:px-8 sm:py-8">
              <div className="space-y-1.5">
                <CardTitle>Claim savings</CardTitle>
                <CardDescription>Reserved vs. billed (cumulative)</CardDescription>
              </div>
              <div className="mt-8">
                <p className="font-mono text-3xl font-semibold leading-none tracking-tight text-[#701a75] tabular-nums dark:text-white sm:text-5xl">
                  {formatMoney(stats.claimSavings)}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
                  Sum of claimed minus approved
                </p>
              </div>
            </div>
          </Card>
        </div>

        {error && (
          <div
            className="mb-8 rounded-2xl border border-red-300/80 bg-red-50 px-5 py-4 text-sm tracking-wide text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        <Card className="overflow-hidden shadow-xl shadow-[#701a75]/[0.08] dark:shadow-black/30">
          {loading && rows.length > 0 && (
            <div className="h-0.5 w-full overflow-hidden bg-zinc-200 dark:bg-zinc-900">
              <div className="h-full w-1/3 animate-pulse bg-[#701a75]/40 dark:bg-zinc-600" />
            </div>
          )}
          <div className="border-b border-zinc-200/90 bg-zinc-50/90 px-4 py-4 dark:border-white/10 dark:bg-zinc-950/80 sm:px-6 sm:py-5">
            <div className="flex items-center gap-2">
              <Activity
                className="h-4 w-4 text-[#701a75] dark:text-zinc-400"
                strokeWidth={1.75}
              />
              <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">
                Live claim queue
              </h2>
            </div>
            <p className="mt-1 text-xs tracking-wide text-zinc-600 dark:text-zinc-500">
              Review opens OCR and manual override controls
            </p>
          </div>

          {loading && rows.length === 0 ? (
            <div className="py-2">
              <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4 text-sm tracking-wide text-zinc-600 dark:border-white/5 dark:text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin text-[#701a75] dark:text-violet-400" />
                Syncing with Supabase…
              </div>
              <TableSkeleton />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm tracking-wide text-zinc-600 dark:text-zinc-500 sm:py-20">
              No claims yet. Submit from{" "}
              <a
                href="/submit"
                className="font-medium text-[#701a75] underline-offset-4 hover:underline dark:text-violet-400"
              >
                Submit Claim
              </a>
              .
            </p>
          ) : (
            <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[720px] text-left text-sm md:min-w-[900px]">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-100/90 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-500">
                    <th className="px-3 py-3 sm:px-5 sm:py-4">Patient</th>
                    <th className="hidden px-3 py-3 md:table-cell sm:px-5 sm:py-4">
                      Visit date
                    </th>
                    <th className="px-3 py-3 text-right sm:px-5 sm:py-4">
                      Claimed
                    </th>
                    <th className="hidden px-3 py-3 lg:table-cell sm:px-5 sm:py-4">
                      Workflow
                    </th>
                    <th className="hidden px-3 py-3 xl:table-cell sm:px-5 sm:py-4">
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4 text-zinc-500" strokeWidth={1.75} />
                        Processed
                      </span>
                    </th>
                    <th className="px-3 py-3 sm:px-5 sm:py-4">
                      <span className="inline-flex items-center gap-2">
                        <Brain
                          className="h-4 w-4 text-zinc-500"
                          strokeWidth={1.75}
                        />
                        AI outcome
                      </span>
                    </th>
                    <th className="px-3 py-3 text-right sm:px-5 sm:py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const wf = workflowStatusBadge(r.status);
                    const fraud = hasFraud(r);
                    return (
                      <tr
                        key={r.claim_id}
                        className="border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-50/80 dark:border-white/5 dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-4 sm:px-5 sm:py-5">
                          <div className="flex items-center gap-3">
                            <PatientAvatar name={r.patient_name} />
                            <div className="min-w-0">
                              <p className="truncate font-medium tracking-wide text-zinc-900 dark:text-zinc-100">
                                {r.patient_name ?? "Member"}
                              </p>
                              <p className="truncate text-xs tracking-wide text-zinc-600 dark:text-zinc-500">
                                {r.member_id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-4 tracking-wide text-zinc-600 dark:text-zinc-400 md:table-cell sm:px-5 sm:py-5">
                          {r.treatment_date ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right font-mono text-sm tabular-nums text-zinc-900 dark:text-zinc-100 sm:px-5 sm:py-5">
                          {formatMoney(r.claim_amount)}
                        </td>
                        <td className="hidden px-3 py-4 lg:table-cell sm:px-5 sm:py-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={wf.variant}
                              className={cn(
                                "font-medium capitalize",
                                wf.className,
                              )}
                            >
                              {wf.label}
                            </Badge>
                            {fraud && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex rounded-full p-1 text-red-400 transition hover:bg-red-500/15 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                                    aria-label="Integrity alert"
                                  >
                                    <AlertTriangle
                                      className="h-4 w-4"
                                      strokeWidth={1.75}
                                    />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  AI detected a potential math inconsistency in
                                  the bill.
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-4 xl:table-cell sm:px-5 sm:py-5">
                          <span className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                            <Clock
                              className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-600"
                              strokeWidth={1.75}
                            />
                            {formatRelativeTime(r.created_at)}
                          </span>
                        </td>
                        <td className="px-3 py-4 sm:px-5 sm:py-5">
                          <AiOutcomePill decision={r.ai_decision} />
                          {r.approved_amount != null && (
                            <p className="mt-2 font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-500">
                              Paid: {formatMoney(r.approved_amount)}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-4 text-right sm:px-5 sm:py-5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 font-medium"
                            onClick={() => openReview(r)}
                          >
                            <Eye className="h-4 w-4" strokeWidth={1.75} />
                            Review
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <ReviewDrawer
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          reviewRow={reviewRow}
          overrideDecision={overrideDecision}
          onOverrideDecision={setOverrideDecision}
          overrideAmount={overrideAmount}
          onOverrideAmount={setOverrideAmount}
          overrideNotes={overrideNotes}
          onOverrideNotes={setOverrideNotes}
          saving={saving}
          saveError={saveError}
          onSaveOverride={saveOverride}
        />
      </div>
    </TooltipProvider>
  );
}
