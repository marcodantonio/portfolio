"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SpotlightSectionProps = {
  children: ReactNode;
  id?: string;
  className?: string;
  variant?: "default" | "story";
  /** Render element. Defaults to <section>. */
  as?: "section" | "div";
};

/**
 * Wraps content with an accent radial spotlight that tracks the cursor.
 * Pointer position is written to CSS custom properties so the glow is
 * painted entirely on the GPU via `.spotlight::before` — no re-renders.
 */
export default function SpotlightSection({
  children,
  id,
  className,
  variant = "default",
  as = "section",
}: SpotlightSectionProps) {
  const ref = useRef<HTMLElement>(null);

  const handleMove = (event: React.MouseEvent<HTMLElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--sx", `${event.clientX - rect.left}px`);
    node.style.setProperty("--sy", `${event.clientY - rect.top}px`);
  };

  const props = {
    id,
    ref,
    onMouseMove: handleMove,
    className: cn(
      "spotlight scroll-mt-28",
      variant === "story" && "story-section",
      className
    ),
  } as const;

  if (as === "div") {
    return <div {...(props as React.ComponentProps<"div">)}>{children}</div>;
  }
  return <section {...(props as React.ComponentProps<"section">)}>{children}</section>;
}
