"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";

type MagneticProps = {
  children: ReactNode;
  /** Pull intensity applied before the element fully locks to the cursor. */
  strength?: number;
  /** Radius in pixels where the magnetic field starts influencing the cursor. */
  radius?: number;
  /**
   * Optional cap, in pixels, on how far the element may translate from its
   * origin on either axis. Useful inside tight cards/columns to stop drift.
   * Omitted = unbounded (original behavior).
   */
  maxOffset?: number;
  className?: string;
};

/**
 * Gives a child a radial magnetic pull toward the cursor, with an elastic
 * snap-back on release. Disabled on touch / coarse pointers.
 */
export default function Magnetic({
  children,
  strength = 0.25,
  radius = 160,
  maxOffset,
  className,
}: MagneticProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const moverRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const mover = moverRef.current;
    if (!anchor || !mover) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const xTo = gsap.quickTo(mover, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(mover, "y", { duration: 0.35, ease: "power3.out" });
    // Clamp the applied translation so the element never drifts past maxOffset.
    const clamp =
      typeof maxOffset === "number"
        ? gsap.utils.clamp(-maxOffset, maxOffset)
        : (value: number) => value;
    let inField = false;
    let releaseTween: gsap.core.Tween | undefined;

    const release = () => {
      if (!inField) return;
      inField = false;
      releaseTween = gsap.to(mover, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.45)" });
    };

    const onMove = (event: PointerEvent) => {
      const rect = anchor.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist >= radius) {
        release();
        return;
      }
      if (!inField) {
        inField = true;
        releaseTween?.kill();
        releaseTween = undefined;
        // The release tween moved x/y outside the quickTo tweens' knowledge;
        // invalidate so they re-read the element's real position, not a stale one.
        xTo.tween.invalidate();
        yTo.tween.invalidate();
      }
      const lockDistance = radius * 0.62;
      const pull =
        dist <= lockDistance
          ? 1
          : strength * Math.pow((radius - dist) / (radius - lockDistance), 0.72);
      xTo(clamp(dx * pull));
      yTo(clamp(dy * pull));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", release);
    document.addEventListener("pointerleave", release);
    document.addEventListener("visibilitychange", release);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", release);
      document.removeEventListener("pointerleave", release);
      document.removeEventListener("visibilitychange", release);
      releaseTween?.kill();
      gsap.killTweensOf(mover);
    };
  }, [radius, strength, maxOffset]);

  return (
    <span ref={anchorRef} className={className} style={{ display: "inline-flex" }}>
      <span ref={moverRef} style={{ display: "inline-flex", willChange: "transform" }}>
        {children}
      </span>
    </span>
  );
}
