"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { EASE_SIGNATURE } from "@/lib/motion";

/**
 * App-launch brand splash shown only during real document load.
 * It does not use artificial delays and fades away as soon as the app is ready.
 */
export function LaunchLoader() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let closeTimer: number | null = null;
    let rafId: number | null = null;

    const close = () => {
      setClosing(true);
      closeTimer = window.setTimeout(() => setVisible(false), reduceMotion ? 0 : 280);
    };

    if (document.readyState === "complete") {
      rafId = window.requestAnimationFrame(close);
    } else {
      window.addEventListener("load", close, { once: true });
    }

    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      if (closeTimer != null) window.clearTimeout(closeTimer);
      window.removeEventListener("load", close);
    };
  }, [reduceMotion]);

  if (!visible) return null;

  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-[1000] grid place-items-center bg-white"
      initial={{ opacity: 1 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: EASE_SIGNATURE }}
    >
      <div className="relative flex min-h-[15rem] w-full max-w-sm flex-col items-center justify-center px-6 text-center">
        <motion.span
          className="absolute size-[11.5rem] rounded-full border border-[#1675C5]/20"
          initial={{ opacity: 0.28, scale: 0.92 }}
          animate={{ opacity: 0.55, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.58, ease: EASE_SIGNATURE }}
        />

        <motion.span
          className="tp-loader-orbit absolute size-[9.25rem] rounded-full border border-dashed border-[#1675C5]/45"
          aria-hidden
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_SIGNATURE }}
          className="relative z-10 rounded-2xl bg-white px-4 py-2 shadow-[0_8px_28px_rgba(22,117,197,0.12)]"
        >
          <Logo priority className="h-10 w-auto sm:h-11" />
        </motion.div>

        <motion.p
          className="mt-4 text-sm font-medium tracking-[0.02em] text-[#1675C5]"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.45, ease: EASE_SIGNATURE, delay: reduceMotion ? 0 : 0.1 }}
        >
          Your journey starts here.
        </motion.p>
      </div>
    </motion.div>
  );
}
