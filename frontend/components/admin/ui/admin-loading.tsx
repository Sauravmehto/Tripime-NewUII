import { cn } from "@/lib/cn";

export function AdminLoading({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-md bg-admin-muted" />
      <div className="overflow-hidden rounded-md border border-admin-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-9 border-b border-admin-border last:border-0"
          >
            <div className="h-full animate-pulse bg-admin-muted/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
