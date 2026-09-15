"use client";

import { useState, type ReactNode } from "react";

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

export function FaqList({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white shadow-soft">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-ink"
              aria-expanded={open}
            >
              {item.question}
              <svg
                viewBox="0 0 24 24"
                className={`size-4 flex-shrink-0 text-ink-subtle transition-transform ${open ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {open && <p className="px-5 pb-4 text-sm text-ink-muted">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
