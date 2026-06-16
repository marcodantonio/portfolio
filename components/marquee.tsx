"use client";

/**
 * Infinite horizontal ticker. The item list is rendered twice back-to-back and
 * the track translates -50%, producing a seamless loop. Pauses on hover; goes
 * static under reduced motion (handled in CSS).
 */
export default function Marquee({ items }: { items: string[] }) {
  const sequence = [...items, ...items];

  return (
    <div className="marquee border-y border-line-subtle py-6" aria-hidden="true">
      <div className="marquee-track">
        {sequence.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-10">
            <span className="marquee-item">{item}</span>
            <span className="marquee-dot" />
          </span>
        ))}
      </div>
    </div>
  );
}
