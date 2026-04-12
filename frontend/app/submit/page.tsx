"use client";

import { useCallback, useState } from "react";
import { Loader2, Upload, Zap } from "lucide-react";
import { ResultsCard } from "@/components/ResultsCard";
import { API_BASE, type AdjudicationResult } from "@/lib/api";

const TEST_CLAIM_AMOUNTS: Record<string, number> = {
  TC001: 1500,
  TC002: 12000,
  TC003: 7500,
};

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm tracking-wide text-zinc-900 outline-none ring-[#701a75]/30 transition placeholder:text-zinc-400 focus:border-[#701a75]/45 focus:ring-2 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:ring-violet-500/50 dark:focus:border-violet-500/50";

export default function SubmitClaimPage() {
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [treatmentDate, setTreatmentDate] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdjudicationResult | null>(null);
  const [claimedSnapshot, setClaimedSnapshot] = useState<number | null>(null);
  const [resultReceivedAt, setResultReceivedAt] = useState<string | null>(null);

  const runQuickTest = async (id: string) => {
    setError(null);
    setResult(null);
    setResultReceivedAt(null);
    setLoading(true);
    setClaimedSnapshot(TEST_CLAIM_AMOUNTS[id] ?? null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/claims/test/${id}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail ?? data),
        );
      }
      setResult(data as AdjudicationResult);
      setResultReceivedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const submitClaim = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setResult(null);
      setResultReceivedAt(null);
      if (!file) {
        setError(
          "Please choose a bill or prescription image/PDF (image recommended).",
        );
        return;
      }
      const amt = parseFloat(claimAmount);
      if (Number.isNaN(amt) || amt < 0) {
        setError("Enter a valid claim amount.");
        return;
      }
      setClaimedSnapshot(amt);
      setLoading(true);
      try {
        const fd = new FormData();
        fd.append("member_id", memberId.trim());
        fd.append("member_name", memberName.trim());
        fd.append("treatment_date", treatmentDate);
        fd.append("claim_amount", String(amt));
        fd.append("file", file);
        const res = await fetch(`${API_BASE}/api/v1/claims`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail ?? data),
          );
        }
        setResult(data as AdjudicationResult);
        setResultReceivedAt(new Date().toISOString());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [file, memberId, memberName, treatmentDate, claimAmount],
  );

  return (
    <div className="mx-auto w-full max-w-[880px] bg-[#fff5f7] pb-20 dark:bg-[#050505]">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#701a75] dark:text-zinc-500">
          Member intake
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Submit a claim
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed tracking-wide text-zinc-600 dark:text-zinc-400">
          Secure channel to the adjudication engine. Documents are OCR’d and
          scored against your Plum OPD policy.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-7 sm:p-9">
        <form onSubmit={submitClaim} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Member ID
              </label>
              <input
                required
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className={inputClass}
                placeholder="EMP001"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Member name
              </label>
              <input
                required
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className={inputClass}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Treatment date
              </label>
              <input
                required
                type="date"
                value={treatmentDate}
                onChange={(e) => setTreatmentDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Claim amount (₹)
              </label>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                className={inputClass}
                placeholder="1500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Bill / prescription (image)
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-white px-6 py-12 transition hover:border-[#701a75]/40 hover:bg-[#fff5f7] dark:border-white/15 dark:bg-zinc-900/40 dark:hover:border-violet-500/40 dark:hover:bg-violet-500/5">
              <Upload className="mb-3 h-9 w-9 text-[#701a75] dark:text-violet-400/80" />
              <span className="text-sm font-medium tracking-wide text-zinc-800 dark:text-zinc-200">
                {file ? file.name : "Click to select or drop a file"}
              </span>
              <span className="mt-2 text-xs tracking-wide text-zinc-500 dark:text-zinc-500">
                PNG, JPG, WebP — multipart to API
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#701a75] py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#701a75]/25 transition hover:bg-[#5c165f] disabled:opacity-50 dark:bg-violet-600 dark:shadow-violet-600/25 dark:hover:bg-violet-500"
          >
            Submit for adjudication
          </button>
        </form>

        <div className="mt-12 border-t border-zinc-200 pt-10 dark:border-white/10">
          <div className="mb-4 flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
            <Zap className="h-5 w-5 text-[#701a75] dark:text-cyan-400" />
            <h2 className="text-sm font-semibold uppercase tracking-widest">
              Quick test (fixtures)
            </h2>
          </div>
          <p className="mb-5 text-xs leading-relaxed tracking-wide text-zinc-600 dark:text-zinc-500">
            Runs against Groq and persists to Supabase.{" "}
            <code className="rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-[#701a75] dark:border-white/10 dark:bg-black/50 dark:text-cyan-300/90">
              POST /api/v1/claims/test/…
            </code>
          </p>
          <div className="flex flex-wrap gap-3">
            {(["TC001", "TC002", "TC003"] as const).map((id) => (
              <button
                key={id}
                type="button"
                disabled={loading}
                onClick={() => runQuickTest(id)}
                className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold tracking-wide text-zinc-800 transition hover:border-[#701a75]/35 hover:bg-[#fff5f7] disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:border-violet-500/40 dark:hover:bg-white/5"
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-10 flex flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-200 bg-white py-14 shadow-sm shadow-[#701a75]/[0.06] backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/40 dark:shadow-none">
          <Loader2 className="h-11 w-11 animate-spin text-[#701a75] dark:text-violet-400" />
          <p className="text-sm font-medium tracking-wide text-zinc-700 dark:text-zinc-300">
            Processing with AI…
          </p>
        </div>
      )}

      {error && (
        <div
          className="mt-10 rounded-2xl border border-red-300/80 bg-red-50 px-5 py-4 text-sm tracking-wide text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {result && !loading && (
        <div className="mt-16 w-full">
          <ResultsCard
            result={result}
            claimedAmount={claimedSnapshot}
            processedAt={resultReceivedAt}
            claimContext={{
              member_id: memberId.trim() || undefined,
              member_name: memberName.trim() || undefined,
              treatment_date: treatmentDate || undefined,
              claim_amount: claimedSnapshot ?? undefined,
            }}
          />
        </div>
      )}
    </div>
  );
}
