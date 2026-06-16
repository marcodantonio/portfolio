import * as React from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const sectionSpaceClasses = {
  hero: "ds-section--space-hero",
  default: "ds-section--space-default",
  compact: "ds-section--space-compact",
  none: "ds-section--space-none",
} as const;

const sectionGridLayoutClasses = {
  hero: "ds-section-grid--layout-hero",
  lead: "ds-section-grid--layout-lead",
  equal: "ds-section-grid--layout-equal",
  thirds: "ds-section-grid--layout-thirds",
  stack: "ds-section-grid--layout-stack",
} as const;

export function PageShell({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-shell"
      className={cn("ds-shell", className)}
      {...props}
    />
  );
}

export function SectionBlock({
  className,
  space = "default",
  ...props
}: React.ComponentProps<"section"> & {
  space?: keyof typeof sectionSpaceClasses;
}) {
  return (
    <section
      data-slot="section-block"
      className={cn("relative", sectionSpaceClasses[space], className)}
      {...props}
    />
  );
}

export function SectionGrid({
  className,
  layout = "stack",
  ...props
}: React.ComponentProps<"div"> & {
  layout?: keyof typeof sectionGridLayoutClasses;
}) {
  return (
    <div
      data-slot="section-grid"
      className={cn(sectionGridLayoutClasses[layout], className)}
      {...props}
    />
  );
}

export function SectionDivider({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="section-divider"
      className={cn("bg-line-subtle", className)}
      {...props}
    />
  );
}
