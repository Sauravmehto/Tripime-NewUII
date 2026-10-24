"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

/** Mobile bottom sheet. Hidden from `lg` up, matching the flight results sheets. */
export function BottomSheet({
  title,
  onClose,
  action,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const titleId = `sheet-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="animate-overlay-in absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
      />
      <div className="animate-sheet-up relative flex max-h-[88vh] flex-col rounded-t-2xl bg-neutral-50 shadow-elevated">
        <div className="flex justify-center pt-2.5" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-neutral-300" />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-1.5">
          <p id={titleId} className="text-[15px] font-semibold text-ink">
            {title}
          </p>
          <div className="flex items-center gap-3">
            {action}
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title.toLowerCase()}`}
              autoFocus
              className="flex size-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-ink transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        {footer ? (
          <div className="border-t border-neutral-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : (
          <div className="pb-[env(safe-area-inset-bottom)]" />
        )}
      </div>
    </div>
  );
}
