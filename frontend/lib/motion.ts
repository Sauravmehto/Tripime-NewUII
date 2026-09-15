/**
 * Shared Motion (motion/react) constants — mirrors the CSS signature easing
 * defined in app/globals.css (--ease-signature). Existing inline usages of
 * [0.16, 1, 0.3, 1] elsewhere are untouched; new/touched components should
 * import from here instead of retyping the array.
 */
export const EASE_SIGNATURE = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  fast: 0.15,
  base: 0.3,
  slow: 0.5,
} as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
} as const;
