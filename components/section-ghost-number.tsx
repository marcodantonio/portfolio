"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";

/** Oversized ghost numeral behind a section, drifting on scroll. Decorative. */
export default function SectionGhostNumber({ index }: { index: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      node,
      { yPercent: 24 },
      {
        yPercent: -24,
        ease: "none",
        scrollTrigger: {
          trigger: node.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <span ref={ref} aria-hidden="true" className="ghost-num">
      {index}
    </span>
  );
}
