"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Entrance reveals for any element tagged `data-reveal`. JS-applied initial
 * state (not CSS) so content stays visible without JS and under reduced motion.
 */
export default function RevealManager() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]");
    if (!targets.length) return;

    gsap.set(targets, { y: 28, opacity: 0 });
    const triggers = ScrollTrigger.batch(targets, {
      start: "top 86%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "expo.out",
          stagger: 0.08,
          overwrite: true,
        }),
    });
    ScrollTrigger.refresh();

    return () => {
      triggers.forEach((t) => t.kill());
      gsap.set(targets, { clearProps: "transform,opacity" });
    };
  }, []);

  return null;
}
