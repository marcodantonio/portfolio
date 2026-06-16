"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";

const NAV_OFFSET = 80; // clear the fixed 64px header when jumping to anchors

/**
 * Inertial smooth scrolling via Lenis driven by GSAP's ticker (official
 * ScrollTrigger integration recipe): one rAF for all scroll work. Disabled
 * entirely under reduced-motion (native scroll). Also upgrades in-page anchor
 * clicks to an eased `scrollTo`. Renders nothing.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const drive = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(drive);
    gsap.ticker.lagSmoothing(0);

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.includes("#")) return;
      const id = href.slice(href.indexOf("#") + 1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -NAV_OFFSET });
      const path = `${window.location.pathname}${window.location.search}#${id}`;
      history.replaceState(null, "", path);
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(drive);
      lenis.destroy();
    };
  }, []);

  return null;
}
