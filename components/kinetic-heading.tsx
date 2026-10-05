import { Eyebrow } from "@/components/system/copy";

type KineticHeadingProps = {
  /** The semantic heading text. */
  text: string;
  /** Small mono eyebrow above the heading (e.g. "// 03 — skills"). */
  eyebrow?: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
};

/** Semantic, static section heading with an optional eyebrow. */
export default function KineticHeading({
  text,
  eyebrow,
  as = "h2",
  className,
}: KineticHeadingProps) {
  const Tag = as;

  return (
    <div className={className}>
      {eyebrow ? (
        <Eyebrow className="mb-3 text-[0.78rem] tracking-[0.24em]">{eyebrow}</Eyebrow>
      ) : null}
      <Tag
        key={text}
        className="ds-display-title ds-display-title--size-section ds-display-title--tone-default"
      >
        {text}
      </Tag>
    </div>
  );
}
