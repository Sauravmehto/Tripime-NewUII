"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-overlay-in absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "animate-sheet-up relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[1.35rem] bg-white shadow-elevated sm:max-w-md sm:rounded-2xl",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <h2 id="modal-title" className="text-base font-bold text-ink sm:text-sm">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="-mr-2 size-11 p-0 lg:size-8">
            <X className="size-4" />
          </Button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

/** Alias for semantic clarity */
export const Dialog = Modal;
