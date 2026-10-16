"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { DURATION, EASE_SIGNATURE } from "@/lib/motion";
import { useMediaQuery } from "@/hooks/use-media-query";

interface SearchPopoverProps {
  open: boolean;
  onClose: () => void;
  /** Wrapper holding both the trigger and the popover; clicks inside it don't close. */
  containerRef: RefObject<HTMLElement | null>;
  /** Accessible name and the title shown on the mobile sheet. */
  title: string;
  children: ReactNode;
  className?: string;
  /** Desktop horizontal anchoring relative to the container. */
  align?: "left" | "right";
}

/**
 * Floating panel for the search form: a dropdown on ≥sm screens and a bottom
 * sheet on phones. Handles Escape, outside clicks and focus return.
 */
export function SearchPopover({
  open,
  onClose,
  containerRef,
  title,
  children,
  className,
  align = "left",
}: SearchPopoverProps) {
  const reduceMotion = useReducedMotion();
  const restoreFocus = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const desktop = useMediaQuery("(min-width: 640px)");

  // On desktop, bring a panel that opens near the fold fully into view.
  useEffect(() => {
    if (!open || !window.matchMedia("(min-width: 640px)").matches) return;
    const id = window.setTimeout(() => {
      panelRef.current?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    }, 60);
    return () => window.clearTimeout(id);
  }, [open, reduceMotion]);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    restoreFocus.current = document.activeElement as HTMLElement | null;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      // The mobile sheet is portalled, so it isn't inside the container.
      if (!container?.contains(target) && !panelRef.current?.contains(target)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      const target = restoreFocus.current;
      // Only pull focus back if it was left inside the closing panel.
      const active = document.activeElement;
      if (target && (container?.contains(active) || active === document.body)) target.focus();
    };
  }, [open, onClose, containerRef]);

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            aria-hidden
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-ink/45 backdrop-blur-[2px] sm:hidden"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: DURATION.fast }}
          />
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-label={title}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[61] flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl bg-white text-ink shadow-elevated",
              "sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-[calc(100%+0.5rem)] sm:max-h-none sm:rounded-2xl sm:border sm:border-neutral-200/80",
              "sm:shadow-[0_24px_60px_-18px_rgb(30_58_138/0.35),0_2px_6px_rgb(16_16_16/0.06)]",
              align === "left" ? "sm:left-0" : "sm:right-0",
              className,
            )}
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: DURATION.base, ease: EASE_SIGNATURE }}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 sm:hidden">
              <span className="mx-auto h-1 w-10 rounded-full bg-neutral-200" aria-hidden />
            </div>
            <div className="flex items-center justify-between px-4 pb-1 pt-2 sm:hidden">
              <p className="text-base font-bold">{title}</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-9 items-center justify-center rounded-xl border border-neutral-200 text-ink-muted"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (desktop) return content;
  // Phones: a bottom sheet portalled to <body>, so transformed ancestors
  // (entrance animations) can't become the containing block for `fixed`.
  return typeof document === "undefined" ? null : createPortal(content, document.body);
}
