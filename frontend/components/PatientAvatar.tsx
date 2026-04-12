"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";

const PALETTES = [
  "bg-violet-500/25 text-violet-200 ring-violet-400/30",
  "bg-cyan-500/20 text-cyan-200 ring-cyan-400/25",
  "bg-emerald-500/20 text-emerald-200 ring-emerald-400/25",
  "bg-fuchsia-500/20 text-fuchsia-200 ring-fuchsia-400/25",
  "bg-amber-500/20 text-amber-200 ring-amber-400/25",
  "bg-sky-500/20 text-sky-200 ring-sky-400/25",
];

function hashName(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initialsFromName(name: string | undefined | null): string {
  const t = (name ?? "").trim();
  if (!t) return "";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

type Props = {
  name?: string | null;
  className?: string;
  size?: "sm" | "md";
};

export function PatientAvatar({ name, className, size = "md" }: Props) {
  const ini = initialsFromName(name);
  const palette = PALETTES[hashName(name ?? "guest") % PALETTES.length];
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ring-inset",
        dim,
        textSize,
        palette,
        className,
      )}
      aria-hidden
    >
      {ini ? (
        ini
      ) : (
        <User className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2} />
      )}
    </span>
  );
}
