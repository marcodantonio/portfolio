import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SpotlightSectionProps = {
  children: ReactNode;
  id?: string;
  className?: string;
  variant?: "default" | "story";
  /** Render element. Defaults to <section>. */
  as?: "section" | "div";
};

/** Full-width semantic wrapper for an anchored homepage story scene. */
export default function SpotlightSection({
  children,
  id,
  className,
  variant = "default",
  as = "section",
}: SpotlightSectionProps) {
  const props = {
    id,
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
