"use client";

import { useEffect, useRef } from "react";
import { Eyebrow } from "@/components/system/copy";
import { gsap, SplitText } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";

type KineticHeadingProps = {
  /** The heading text; split into chars for the staggered mask reveal. */
  text: string;
  /** Small mono eyebrow above the heading (e.g. "// 03 — skills"). */
  eyebrow?: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
};

/**
 * Section heading whose characters rise out of a clip mask, staggered, when it
 * first scrolls into view (GSAP SplitText). The plain text stays in the DOM
 * until fonts are ready, and is restored on unmount — accessible/selectable.
 */
export default function KineticHeading({
  text,
  eyebrow,
  as = "h2",
  className,
}: KineticHeadingProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const node = headingRef.current;
    if (!node || prefersReducedMotion()) return;

    let split: SplitText | undefined;
    let tween: gsap.core.Tween | undefined;
    let cancelled = false;

    // Split only once webfonts are in, so glyph metrics are final.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      split = new SplitText(node, { type: "words,chars", mask: "words" });
      tween = gsap.from(split.chars, {
        yPercent: 115,
        duration: 0.85,
        ease: "expo.out",
        stagger: 0.018,
        scrollTrigger: { trigger: node, start: "top 84%", once: true },
      });
    });

    return () => {
      cancelled = true;
      tween?.scrollTrigger?.kill();
      tween?.kill();
      split?.revert();
    };
  }, [text]);

  const Tag = as;

  return (
    <div className={className}>
      {eyebrow ? (
        <Eyebrow className="mb-3 text-[0.78rem] tracking-[0.24em]">{eyebrow}</Eyebrow>
      ) : null}
      <Tag
        // Swap the element on text change so React never patches text into
        // SplitText's generated DOM (the old node reverts harmlessly detached).
        key={text}
        ref={headingRef}
        className="ds-display-title ds-display-title--size-section ds-display-title--tone-default"
      >
        {text}
      </Tag>
    </div>
  );
}
