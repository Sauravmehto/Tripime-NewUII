import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export function AdminErrorState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger-500/20 bg-danger-50 px-3 py-2 text-[12px] text-danger-700"
    >
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p>{message}</p>
        {action ? <div className="mt-1.5">{action}</div> : null}
      </div>
    </div>
  );
}
