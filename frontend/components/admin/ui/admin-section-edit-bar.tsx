import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminSectionEditBar({
  editing,
  dirty,
  saving,
  onEdit,
  onCancel,
  onSave,
}: {
  editing: boolean;
  dirty: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!editing) {
    return (
      <Button type="button" variant="outline" size="xs" onClick={onEdit}>
        <Pencil className="size-3" />
        Edit
      </Button>
    );
  }
  return (
    <div className="flex gap-1">
      <Button type="button" variant="outline" size="xs" disabled={saving} onClick={onCancel}>
        <X className="size-3" />
        Cancel
      </Button>
      <Button type="button" variant="admin" size="xs" disabled={saving || !dirty} onClick={onSave}>
        <Save className="size-3" />
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
