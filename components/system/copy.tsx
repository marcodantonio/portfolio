import * as React from "react";
import { cn } from "@/lib/utils";

const eyebrowToneClasses = {
  default: "ds-eyebrow--default",
  inverse: "ds-eyebrow--inverse",
} as const;

const displayTitleSizeClasses = {
  hero: "ds-display-title--size-hero",
  page: "ds-display-title--size-page",
  section: "ds-display-title--size-section",
} as const;

const displayTitleToneClasses = {
  default: "ds-display-title--tone-default",
  inverse: "ds-display-title--tone-inverse",
} as const;

const bodyCopySizeClasses = {
  default: "ds-body-copy--size-default",
  lg: "ds-body-copy--size-lg",
} as const;

const bodyCopyToneClasses = {
  default: "ds-body-copy--tone-default",
  inverse: "ds-body-copy--tone-inverse",
} as const;

type CommonTone = "default" | "inverse";

export function Eyebrow({
  className,
  tone,
  ...props
}: React.ComponentProps<"p"> & { tone?: CommonTone }) {
  const dsTone = tone ?? "default";

  return (
    <p
      data-slot="eyebrow"
      className={cn("ds-eyebrow", eyebrowToneClasses[dsTone], className)}
      {...props}
    />
  );
}

export function DisplayTitle({
  as,
  className,
  tone,
  size,
  ...props
}: {
  as?: "h1" | "h2" | "h3";
} & React.ComponentProps<"h2"> & {
  tone?: CommonTone;
  size?: keyof typeof displayTitleSizeClasses;
}) {
  const Comp = as ?? "h2";

  const dsTone = tone ?? "default";
  const dsSize = size ?? "section";

  return (
    <Comp
      data-slot="display-title"
      className={cn(
        "ds-display-title",
        displayTitleSizeClasses[dsSize],
        displayTitleToneClasses[dsTone],
        className
      )}
      {...props}
    />
  );
}

export function BodyCopy({
  as,
  className,
  tone,
  size,
  ...props
}: {
  as?: "p" | "div";
} & React.ComponentProps<"p"> & {
  tone?: CommonTone;
  size?: keyof typeof bodyCopySizeClasses;
}) {
  const Comp = as ?? "p";

  const dsTone = tone ?? "default";
  const dsSize = size ?? "default";

  return (
    <Comp
      data-slot="body-copy"
      className={cn(
        "ds-body-copy",
        bodyCopySizeClasses[dsSize],
        bodyCopyToneClasses[dsTone],
        className
      )}
      {...props}
    />
  );
}

type SectionLeadProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  tone?: CommonTone;
  titleSize?: "hero" | "page" | "section";
  headingLevel?: "h1" | "h2" | "h3";
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  children?: React.ReactNode;
};

export function SectionLead({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "default",
  titleSize = "section",
  headingLevel = "h2",
  className,
  titleClassName,
  descriptionClassName,
  children,
}: SectionLeadProps) {
  const aligned =
    align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <div data-slot="section-lead" className={cn("flex flex-col gap-5", aligned, className)}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <DisplayTitle
        as={headingLevel}
        tone={tone}
        size={titleSize}
        className={titleClassName}
      >
        {title}
      </DisplayTitle>
      {description ? (
        <BodyCopy
          tone={tone}
          size={titleSize === "hero" || titleSize === "page" ? "lg" : "default"}
          className={descriptionClassName}
        >
          {description}
        </BodyCopy>
      ) : null}
      {children}
    </div>
  );
}
