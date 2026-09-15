"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface CarouselProps {
  children: ReactNode;
  className?: string;
  gapClassName?: string;
}

export function Carousel({
  children,
  className,
  gapClassName = "gap-3",
}: CarouselProps) {
  const ref = useRef<HTMLDivElement>(null);

  function scroll(direction: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.75, 320);
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        className={cn(
          "no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1",
          gapClassName,
        )}
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 z-10 hidden size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-soft hover:bg-neutral-50 md:flex"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 z-10 hidden size-8 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-soft hover:bg-neutral-50 md:flex"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
