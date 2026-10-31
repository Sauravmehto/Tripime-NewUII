"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";

/** A coupon code with a one-tap copy button. Only render it when a real code exists. */
export function CopyCode({ code, className }: { code: string; className?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast(`Copied ${code}`, "success");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Couldn’t copy automatically. Select the code and copy it manually.", "danger");
    }
  }

  return (
    <div
      className={cn(
        "flex items-stretch overflow-hidden rounded-lg border border-dashed border-primary-300 bg-primary-50",
        className,
      )}
    >
      <div className="min-w-0 flex-1 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Coupon code</p>
        <p className="select-all truncate font-mono text-sm font-bold tracking-wide text-ink">{code}</p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Copy coupon code ${code}`}
        className="inline-flex min-h-11 min-w-[5.5rem] shrink-0 items-center justify-center gap-1.5 border-l border-dashed border-primary-300 px-3 text-xs font-semibold text-primary-700 transition hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset active:scale-95"
      >
        {copied ? (
          <Check className="size-3.5 text-success-700" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
