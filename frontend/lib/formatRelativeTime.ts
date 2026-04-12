/**
 * Human-friendly relative time from an ISO-ish date string (e.g. Supabase timestamptz).
 */
export function formatRelativeTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const now = Date.now();
  const sec = Math.round((now - then) / 1000);
  if (sec < 45) return "Just now";
  if (sec < 90) return "1 minute ago";
  if (sec < 3600) return `${Math.floor(sec / 60)} minutes ago`;
  if (sec < 7200) return "1 hour ago";
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  const dayStart = (d: number) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const days = Math.floor(
    (dayStart(now) - dayStart(then)) / (24 * 3600 * 1000),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(then).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: then < now - 365 * 86400000 ? "numeric" : undefined,
  });
}
