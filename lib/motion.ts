/**
 * Central motion tokens and helpers — one source of truth for timing/easing so
 * every animated surface feels part of the same system.
 */

/** Easing curves (cubic-bezier args) shared across JS-driven animation. */
export const EASE = {
  /** Expo-out — premium, decisive entrances. */
  out: [0.16, 1, 0.3, 1] as const,
  /** Smooth in-out for parallax/loops. */
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const DURATION = {
  fast: 0.35,
  base: 0.6,
  slow: 0.85,
};

/** True when the user asked for reduced motion (SSR-safe → false on server). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True for fine pointer devices (desktop). Smooth-scroll/heavy motion target. */
export function isFinePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
