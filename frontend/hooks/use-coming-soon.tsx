"use client";

import { useCallback, useState } from "react";
import { ComingSoonDialog } from "@/components/ui/coming-soon-dialog";

/** Lightweight state helper for coming-soon CTAs — no SweetAlert. */
export function useComingSoon(product: string) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  const dialog = (
    <ComingSoonDialog open={open} onClose={hide} product={product} />
  );

  return { show, hide, dialog, open };
}
