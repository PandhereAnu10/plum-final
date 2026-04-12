"use client";

import Link from "next/link";
import { FileStack, Home, LayoutDashboard, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/submit", label: "Submit Claim", icon: FileStack },
  { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/90 bg-white/90 shadow-sm shadow-[#701a75]/[0.06] backdrop-blur-xl dark:border-white/10 dark:bg-[#050505]/95 dark:shadow-black/20">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <ShieldCheck
            className="h-6 w-6 shrink-0 text-[#701a75] dark:text-purple-500"
            size={24}
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="flex items-baseline gap-0.5 text-lg tracking-tight">
            <span className="font-extrabold text-zinc-900 dark:text-zinc-50">
              PLUM
            </span>
            <span className="font-light text-[#701a75] dark:text-purple-400">
              OPD
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <nav className="flex items-center gap-0.5 sm:gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border border-transparent px-2.5 py-2 text-sm font-medium tracking-wide text-zinc-600 transition sm:gap-2 sm:px-3 sm:py-2.5",
                  "hover:border-zinc-200 hover:bg-[#fff5f7] hover:text-[#701a75] dark:text-zinc-300 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white",
                )}
              >
                <Icon
                  className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-500"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
