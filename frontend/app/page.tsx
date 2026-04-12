import Link from "next/link";
import { ArrowRight, Cpu, Shield, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="glass-panel-strong rounded-3xl p-8 sm:p-12">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#701a75]/20 bg-[#701a75]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#701a75] dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
          <Sparkles className="h-3.5 w-3.5 text-[#701a75] dark:text-violet-400" />
          AI command center
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl sm:leading-tight">
          OPD claims,
          <span className="block bg-gradient-to-r from-[#701a75] to-purple-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-cyan-300">
            adjudicated in seconds
          </span>
        </h1>
        <p className="mt-6 text-base leading-relaxed tracking-wide text-zinc-600 dark:text-zinc-400">
          Upload bills and prescriptions, or run fixture cases. Groq evaluates
          each submission against Plum policy rules — with a clear decision,
          amounts, and confidence score. Built for operators who need speed and
          auditability.
        </p>
        <ul className="mt-10 space-y-4 text-sm tracking-wide text-zinc-700 dark:text-zinc-300">
          <li className="flex gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900/80">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <span className="pt-1">
              Policy-aware decisions using your{" "}
              <code className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-xs text-[#701a75] dark:border-white/10 dark:bg-black/40 dark:text-cyan-300">
                policy_terms
              </code>{" "}
              and adjudication rules.
            </span>
          </li>
          <li className="flex gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900/80">
              <Cpu className="h-5 w-5 text-[#701a75] dark:text-violet-400" />
            </span>
            <span className="pt-1">
              Human-in-the-loop review, fraud signals, and a dark ops dashboard
              tuned for real claim volumes.
            </span>
          </li>
        </ul>
        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[#701a75] px-7 py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#701a75]/25 transition hover:bg-[#5c165f] active:scale-[0.98] dark:bg-violet-600 dark:shadow-violet-600/30 dark:hover:bg-violet-500"
          >
            Submit a claim
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-xl border border-zinc-300 bg-white px-7 py-3.5 text-sm font-semibold tracking-wide text-zinc-800 transition hover:border-[#701a75]/35 hover:bg-[#fff5f7] dark:border-white/15 dark:bg-white/5 dark:text-zinc-100 dark:hover:border-cyan-500/40 dark:hover:bg-white/10"
          >
            Open admin console
          </Link>
        </div>
      </div>
    </div>
  );
}
