"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Typewriter } from "@/components/Typewriter";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { postPolicyChat } from "@/lib/api";
import type { AdjudicationResult } from "@/lib/api";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; text: string; id: string };

type Props = {
  result: AdjudicationResult;
  claimContext?: Record<string, unknown>;
};

function adjudicationSnapshot(r: AdjudicationResult): Record<string, unknown> {
  return {
    claim_id: r.claim_id,
    decision: r.decision,
    approved_amount: r.approved_amount,
    confidence_score: r.confidence_score,
    notes: r.notes,
    reasoning: r.reasoning,
    rejection_reasons: r.rejection_reasons,
    rejected_items: r.rejected_items,
    flags: r.flags,
    fraud_indicators: r.fraud_indicators,
    deductions: r.deductions,
  };
}

let msgId = 0;
function nextId() {
  msgId += 1;
  return `m-${msgId}`;
}

function ThinkingDots() {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-2xl bg-[#701a75]/10 px-4 py-3 text-sm text-zinc-600 dark:bg-violet-950/30 dark:text-zinc-500"
      aria-live="polite"
      aria-label="Thinking"
    >
      <span className="sr-only">Thinking</span>
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-[#701a75]/50 dark:bg-zinc-400/80"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span className="text-zinc-600 dark:text-zinc-500">Thinking</span>
    </div>
  );
}

export function PolicyExplainChat({ result, claimContext }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setError(null);
    setInput("");
    const userMsg: Msg = { role: "user", text: q, id: nextId() };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const answer = await postPolicyChat({
        question: q,
        claim_context: claimContext,
        adjudication_snapshot: adjudicationSnapshot(result),
      });
      const text = answer || "—";
      setMessages((m) => [
        ...m,
        { role: "assistant", text, id: nextId() },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [claimContext, input, loading, result]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center rounded-2xl border border-zinc-200/90 bg-zinc-50 px-5 py-4 text-left transition hover:border-[#701a75]/25 hover:bg-[#fff5f7] dark:border-white/[0.08] dark:bg-zinc-900/25 dark:hover:border-white/12 dark:hover:bg-zinc-900/40"
      >
        <span className="text-sm text-zinc-600 transition group-hover:text-[#701a75] dark:text-zinc-500 dark:group-hover:text-zinc-400">
          Ask a question about this claim…
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex h-full max-h-[100dvh] w-full flex-col border-l border-zinc-200/90 p-0 dark:border-white/[0.06] sm:max-w-md"
        >
          <SheetHeader className="shrink-0 border-b border-zinc-200/90 px-8 py-8 text-left dark:border-white/[0.06]">
            <SheetTitle className="text-base font-semibold tracking-tight text-[#701a75] dark:text-zinc-50">
              Policy Q&amp;A
            </SheetTitle>
            <SheetDescription className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-500">
              Grounded in your policy terms and this claim only.
            </SheetDescription>
          </SheetHeader>

          <div
            ref={listRef}
            className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-8 py-8"
          >
            {messages.length === 0 && !loading && (
              <p className="text-sm leading-[1.7] text-zinc-600 dark:text-zinc-500">
                Ask about limits, exclusions, copay, or how this decision maps
                to your policy. Your conversation stays in this panel.
              </p>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[min(100%,28rem)] rounded-2xl px-5 py-3.5 text-sm leading-[1.65]",
                  m.role === "user"
                    ? "ml-auto bg-[#701a75] text-white dark:bg-zinc-800 dark:text-zinc-100"
                    : "mr-auto bg-[#701a75]/10 text-zinc-800 dark:bg-violet-950/25 dark:text-zinc-200",
                )}
              >
                {m.role === "assistant" ? (
                  <Typewriter
                    key={m.id}
                    text={m.text}
                    mode="char"
                    msPerTick={10}
                    showCursor
                    className="text-zinc-800 dark:text-zinc-200"
                  />
                ) : (
                  m.text
                )}
              </div>
            ))}

            {loading && <ThinkingDots />}

            {error && (
              <p className="text-sm text-red-400/90" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-zinc-200/90 bg-white px-6 py-5 dark:border-white/[0.06] dark:bg-[#050505]">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask a question…"
                className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-500 focus:border-[#701a75]/40 focus:bg-white dark:border-white/[0.08] dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-white/15 dark:focus:bg-zinc-900/70"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#701a75]/30 bg-[#701a75] px-5 py-3.5 text-white transition hover:bg-[#5c165f] disabled:opacity-35 dark:border-white/10 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                aria-label="Send"
              >
                <Send className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
