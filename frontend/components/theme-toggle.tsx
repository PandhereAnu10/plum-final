"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent"
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="shrink-0 rounded-xl border border-zinc-200/80 bg-white text-zinc-700 shadow-sm hover:bg-[#fff5f7] dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to Plum light mode" : "Switch to midnight mode"}
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px] text-amber-300" strokeWidth={1.75} />
      ) : (
        <Moon className="h-[18px] w-[18px] text-[#701a75]" strokeWidth={1.75} />
      )}
    </Button>
  );
}
