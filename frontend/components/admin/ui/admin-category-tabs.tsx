"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function AdminCategoryTabs({
  tabs,
  value,
  onChange,
  wrap = false,
}: {
  tabs: { id: string; label: string; icon: LucideIcon }[];
  value: string;
  onChange: (id: string) => void;
  wrap?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-admin-border bg-sky-50/80 px-2 py-2">
      <div className={cn("flex gap-2", wrap ? "flex-wrap" : "min-w-max")}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex min-w-[92px] flex-col items-center gap-1 rounded-md border bg-white px-3 py-2 text-[11px] font-semibold transition",
                active
                  ? "border-amber-400 text-admin-ink shadow-xs"
                  : "border-admin-border text-admin-ink-muted hover:bg-admin-muted hover:text-admin-ink",
              )}
            >
              <Icon className="size-4 text-admin-slate" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
