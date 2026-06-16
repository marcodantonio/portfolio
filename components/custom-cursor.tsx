"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const HOVER_SELECTOR = "a, button, [role='button'], [data-cursor]";
const STATES = ["hov", "drag", "view"] as const;

/**
 * Two-layer custom cursor (dot + trailing ring) driven by GSAP quickTo.
 * Contextual states come from `data-cursor` attributes via event delegation,
 * so dynamically mounted nodes are covered and nothing leaks.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power2.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power2.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });

    let alive = false;
    const onMove = (e: MouseEvent) => {
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
      if (!alive) {
        // Class-based reveal: inline opacity would override the state rules
        // (.drag/.view hide the dot via stylesheet).
        dot.classList.add("live");
        ring.classList.add("live");
        alive = true;
      }
    };

    const setState = (state: string | null) => {
      for (const s of STATES) {
        dot.classList.toggle(s, s === state);
        ring.classList.toggle(s, s === state);
      }
    };
    const onOver = (e: MouseEvent) => {
      const hit = (e.target as Element | null)?.closest?.(HOVER_SELECTOR);
      if (!hit) {
        setState(null);
        return;
      }
      setState(hit.getAttribute("data-cursor") || "hov");
    };

    const onDown = () => {
      dot.classList.add("click");
      ring.classList.add("click");
    };
    const onUp = () => {
      dot.classList.remove("click");
      ring.classList.remove("click");
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      gsap.killTweensOf([dot, ring]);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cur-dot" />
      <div ref={ringRef} className="cur-ring" />
    </>
  );
}
