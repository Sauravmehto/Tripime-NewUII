"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminRowMenuStop } from "./admin-row-menu";

export function AdminRowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete?: () => void;
}) {
  return (
    <AdminRowMenuStop>
      <div className="flex gap-1">
        <Button size="xs" variant="ghost" onClick={onEdit}>
          <Pencil className="size-3" />
          Edit
        </Button>
        {onDelete ? (
          <Button size="xs" variant="ghost" className="text-danger-700" onClick={onDelete}>
            <Trash2 className="size-3" />
            Delete
          </Button>
        ) : null}
      </div>
    </AdminRowMenuStop>
  );
}

export function AdminThumb({ src, alt = "" }: { src: string; alt?: string }) {
  if (!src) return <span className="text-admin-ink-subtle">—</span>;
  return (
    // CMS image URLs are not limited to next.config remote hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="size-10 rounded object-cover" />
  );
}
