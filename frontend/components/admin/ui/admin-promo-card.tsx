"use client";

import { Ban, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function AdminPromoCard({
  imageUrl,
  title,
  badge,
  active,
  caption,
  expired,
  showDelete,
  onEdit,
  onToggle,
  onDelete,
}: {
  imageUrl: string;
  title: string;
  badge: string;
  active: boolean;
  /** Short summary line shown over the image (discount, coupon, validity). */
  caption?: string;
  expired?: boolean;
  showDelete?: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="flex overflow-hidden rounded-md border border-admin-border bg-admin-surface shadow-xs">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-2 border-r border-admin-border bg-white py-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-admin-ink-muted hover:text-admin-ink"
        >
          <Pencil className="size-3.5" />
          Edit
        </button>
        {showDelete && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-danger-700 hover:text-danger-700"
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex flex-col items-center gap-0.5 text-[10px] font-semibold",
            active ? "text-success-700" : "text-danger-700",
          )}
        >
          {active ? <CheckCircle2 className="size-3.5" /> : <Ban className="size-3.5" />}
          {active ? "Active" : "Inactive"}
        </button>
      </div>
      <div className="relative min-h-[112px] min-w-0 flex-1">
        {imageUrl ? (
          // CMS URLs can be any host; native img avoids Next remote-pattern lock-in.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title || badge} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-[112px] items-center justify-center bg-admin-muted text-[12px] text-admin-ink-subtle">
            No image
          </div>
        )}
        {title || caption ? (
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent p-2 pr-24 text-white">
            {title ? <p className="truncate text-[12px] font-semibold">{title}</p> : null}
            {caption ? <p className="truncate text-[10px] opacity-90">{caption}</p> : null}
          </div>
        ) : null}
        {expired ? (
          <span className="absolute left-2 top-2 rounded-full bg-danger-700 px-2 py-0.5 text-[10px] font-semibold text-white">
            Expired
          </span>
        ) : null}
        <span className="absolute bottom-2 right-2 rounded-full bg-admin-ink/85 px-2 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      </div>
    </article>
  );
}
