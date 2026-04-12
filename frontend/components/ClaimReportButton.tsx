"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ClaimReport } from "@/components/ClaimReport";
import { Button } from "@/components/ui/button";
import type { ClaimReportPayload } from "@/lib/claimReport";
import { exportClaimReportToPdf } from "@/lib/exportClaimPdf";
import { cn } from "@/lib/utils";

type Props = {
  payload: ClaimReportPayload;
  className?: string;
  size?: "default" | "sm";
};

export function ClaimReportButton({ payload, className, size = "sm" }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const handleDownload = useCallback(async () => {
    const el = captureRef.current;
    if (!el) {
      toast.error("Report is not ready. Try again.");
      return;
    }
    setBusy(true);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await exportClaimReportToPdf(el, payload.claimId);
      toast.success("Report saved to your device");
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Could not generate report. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }, [payload.claimId]);

  return (
    <>
      <div
        className="pointer-events-none fixed left-[-12000px] top-0 z-0 w-[794px]"
        aria-hidden
      >
        <ClaimReport ref={captureRef} {...payload} />
      </div>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={busy}
        className={cn("gap-2", className)}
        onClick={() => void handleDownload()}
        title="Download official adjudication report (PDF)"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={1.75} />
        ) : (
          <Download className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        )}
        {busy ? "Preparing report…" : "Download Report"}
      </Button>
    </>
  );
}
