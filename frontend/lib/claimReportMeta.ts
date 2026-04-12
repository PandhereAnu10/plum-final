/** Non-empty trimmed string from API / form values (handles numbers). */
export function coerceDisplayString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : undefined;
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return String(value);
  }
  return undefined;
}

/** First usable string among candidates (e.g. context vs result). */
export function pickDisplayString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    const s = coerceDisplayString(c);
    if (s) return s;
  }
  return undefined;
}

/**
 * Human-readable treatment date for certificates (e.g. "12 Nov 2024").
 * Parses YYYY-MM-DD from date inputs without UTC day-shift.
 */
export function formatTreatmentDateForReport(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  let d: Date;
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    d = new Date(y, mo, day);
  } else {
    d = new Date(s);
  }
  if (Number.isNaN(d.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}
