import { AdminPageHeader } from "./admin-page-header";
import { AdminCard } from "./ui/admin-card";

export function AdminPlaceholderView({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <AdminPageHeader title={title} description="This workspace is reserved for a later phase." />
      <AdminCard>
        <p className="text-[13px] text-admin-ink-muted">{description}</p>
        <p className="mt-1 text-[11px] text-admin-ink-subtle">Placeholder — no data to manage yet.</p>
      </AdminCard>
    </div>
  );
}
