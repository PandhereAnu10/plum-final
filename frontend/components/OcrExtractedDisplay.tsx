"use client";

import { Fragment, type ReactNode } from "react";

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Remove lines like === Simulated ... === and similar banner lines. */
export function stripOcrNoise(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^=+\s*.+?\s*=+$/.test(line))
    .join("\n")
    .trim();
}

/** Isolate the first balanced `{ ... }` substring (handles strings with braces). */
export function extractJsonObjectSubstring(raw: string): string | null {
  const cleaned = stripOcrNoise(raw);
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return null;
}

function scalarToDisplay(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return String(v);
  return JSON.stringify(v);
}

function objectToPairs(obj: Record<string, unknown>): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === "") continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      out.push([humanizeKey(k), scalarToDisplay(v)]);
      continue;
    }
    if (Array.isArray(v)) {
      out.push([
        humanizeKey(k),
        v.every((x) => typeof x !== "object")
          ? v.map(String).join(", ")
          : JSON.stringify(v),
      ]);
      continue;
    }
    out.push([humanizeKey(k), String(v)]);
  }
  return out;
}

function TwoColumnFieldGrid({ pairs }: { pairs: [string, string][] }) {
  if (pairs.length === 0)
    return <p className="text-sm text-zinc-600 dark:text-zinc-500">—</p>;
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-[minmax(7rem,11rem)_1fr]">
      {pairs.map(([label, val]) => (
        <Fragment key={label}>
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-500">
            {label}
          </div>
          <div className="text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
            {val}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function renderDocumentBlock(title: string, data: unknown): ReactNode {
  if (data == null || data === "") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm shadow-[#701a75]/[0.05] dark:border-white/10 dark:bg-[#080808] dark:shadow-none">
        <h4 className="text-sm font-semibold tracking-wide text-zinc-800 dark:text-zinc-300">
          {title}
        </h4>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-500">
          No details
        </p>
      </div>
    );
  }
  if (typeof data === "object" && !Array.isArray(data)) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm shadow-[#701a75]/[0.05] dark:border-white/10 dark:bg-[#080808] dark:shadow-none">
        <h4 className="text-sm font-semibold tracking-wide text-zinc-800 dark:text-zinc-300">
          {title}
        </h4>
        <div className="mt-4">
          <TwoColumnFieldGrid pairs={objectToPairs(data as Record<string, unknown>)} />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm shadow-[#701a75]/[0.05] dark:border-white/10 dark:bg-[#080808] dark:shadow-none">
      <h4 className="text-sm font-semibold tracking-wide text-zinc-800 dark:text-zinc-300">
        {title}
      </h4>
      <p className="mt-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        {scalarToDisplay(data)}
      </p>
    </div>
  );
}

function DocumentsSection({ value }: { value: unknown }): ReactNode {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    const prescription =
      o.prescription ??
      o.Prescription ??
      o.rx ??
      o.prescription_details;
    const bill =
      o.bill ??
      o.Bill ??
      o.invoice ??
      o.hospital_bill ??
      o.bill_details;
    const hasRx = prescription != null && prescription !== "";
    const hasBill = bill != null && bill !== "";
    if (!hasRx && !hasBill && Object.keys(o).length > 0) {
      return (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm shadow-[#701a75]/[0.05] dark:border-white/10 dark:bg-[#080808] dark:shadow-none">
          <TwoColumnFieldGrid pairs={objectToPairs(o)} />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {renderDocumentBlock("Prescription", hasRx ? prescription : null)}
        {renderDocumentBlock("Bill", hasBill ? bill : null)}
      </div>
    );
  }
  if (Array.isArray(value)) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {value.map((item, i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm shadow-[#701a75]/[0.05] dark:border-white/10 dark:bg-[#080808] dark:text-zinc-200 dark:shadow-none"
          >
            {typeof item === "object" && item !== null ? (
              <TwoColumnFieldGrid
                pairs={objectToPairs(item as Record<string, unknown>)}
              />
            ) : (
              scalarToDisplay(item)
            )}
          </div>
        ))}
      </div>
    );
  }
  return (
    <p className="text-sm text-zinc-800 dark:text-zinc-300">
      {scalarToDisplay(value)}
    </p>
  );
}

function unwrapPayload(data: Record<string, unknown>): Record<string, unknown> {
  if (
    data.input_data &&
    typeof data.input_data === "object" &&
    !Array.isArray(data.input_data)
  ) {
    return data.input_data as Record<string, unknown>;
  }
  return data;
}

function renderParsedObject(data: Record<string, unknown>): ReactNode {
  const payload = unwrapPayload(data);
  const blocks: ReactNode[] = [];

  const docEntry = Object.entries(payload).find(
    ([k]) => k.toLowerCase() === "documents",
  );
  const restEntries = Object.entries(payload).filter(
    ([k, v]) =>
      k.toLowerCase() !== "documents" &&
      v !== null &&
      v !== undefined &&
      v !== "",
  );

  if (docEntry) {
    blocks.push(
      <div key="documents" className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-500">
          Documents
        </div>
        <DocumentsSection value={docEntry[1]} />
      </div>,
    );
  }

  const simplePairs: [string, string][] = [];
  for (const [k, v] of restEntries) {
    if (v === null || v === undefined || v === "") continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      blocks.push(
        <div key={k} className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-500">
            {humanizeKey(k)}
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm shadow-[#701a75]/[0.05] dark:border-white/10 dark:bg-[#080808] dark:shadow-none">
            <TwoColumnFieldGrid
              pairs={objectToPairs(v as Record<string, unknown>)}
            />
          </div>
        </div>,
      );
      continue;
    }
    if (Array.isArray(v)) {
      simplePairs.push([
        humanizeKey(k),
        v.every((x) => typeof x !== "object")
          ? v.map(String).join(", ")
          : JSON.stringify(v),
      ]);
      continue;
    }
    simplePairs.push([humanizeKey(k), String(v)]);
  }

  if (simplePairs.length > 0) {
    blocks.unshift(
      <div key="fields" className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-500">
          Record
        </div>
        <TwoColumnFieldGrid pairs={simplePairs} />
      </div>,
    );
  }

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-500">
        No displayable fields in this JSON.
      </p>
    );
  }

  return <div className="flex flex-col gap-8">{blocks}</div>;
}

type Props = {
  raw: string;
};

export function OcrExtractedDisplay({ raw }: Props) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-500">
        No extracted text for this claim.
      </p>
    );
  }

  const jsonStr = extractJsonObjectSubstring(trimmed);
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return renderParsedObject(parsed as Record<string, unknown>);
      }
    } catch {
      /* fall through */
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-5 py-5 shadow-sm shadow-[#701a75]/[0.05] dark:border-white/10 dark:bg-[#080808] dark:shadow-none">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-500">
        Document text
      </p>
      <div
        className="font-serif text-[15px] leading-[1.75] text-zinc-800 antialiased dark:text-zinc-200"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {stripOcrNoise(trimmed)}
      </div>
    </div>
  );
}
