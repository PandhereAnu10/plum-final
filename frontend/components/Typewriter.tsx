"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type TypewriterProps = {
  text: string;
  mode?: "char" | "word";
  msPerTick?: number;
  className?: string;
  showCursor?: boolean;
  onComplete?: () => void;
};

/**
 * Reveals text progressively (char or whitespace-preserving tokens) for AI “typing” UX.
 */
export function Typewriter({
  text,
  mode = "word",
  msPerTick = 24,
  className,
  showCursor = true,
  onComplete,
}: TypewriterProps) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    setDone(false);
    if (!text) {
      setDisplay("");
      setDone(true);
      completeRef.current?.();
      return;
    }

    setDisplay("");
    let cancelled = false;

    if (mode === "char") {
      let i = 0;
      const id = window.setInterval(() => {
        if (cancelled) return;
        i += 1;
        setDisplay(text.slice(0, i));
        if (i >= text.length) {
          window.clearInterval(id);
          setDone(true);
          completeRef.current?.();
        }
      }, msPerTick);
      return () => {
        cancelled = true;
        window.clearInterval(id);
      };
    }

    /** Words + whitespace so newlines are preserved */
    const tokens = text.split(/(\s+)/).filter((t) => t.length > 0);
    if (tokens.length === 0) {
      setDone(true);
      completeRef.current?.();
      return;
    }

    let ti = 0;
    const id = window.setInterval(() => {
      if (cancelled) return;
      ti += 1;
      setDisplay(tokens.slice(0, ti).join(""));
      if (ti >= tokens.length) {
        window.clearInterval(id);
        setDone(true);
        completeRef.current?.();
      }
    }, msPerTick);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [text, mode, msPerTick]);

  return (
    <span className={cn("inline whitespace-pre-wrap", className)}>
      {display}
      {showCursor && !done && (
        <span
          className="ml-px inline-block min-h-[1em] w-0.5 animate-pulse bg-zinc-500 align-middle"
          aria-hidden
        />
      )}
    </span>
  );
}
