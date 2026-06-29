"use client";

import { useEffect, useRef } from "react";
import { experiencesData } from "@/lib/data";
import KineticHeading from "@/components/kinetic-heading";
import { useLanguage } from "@/context/language-context";
import { ScrollTrigger } from "@/lib/gsap";

export default function Experience() {
  const { t } = useLanguage();
  const timelineRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    const timeline = timelineRef.current;
    const fill = fillRef.current;
    if (!timeline || !fill) return;

    // Reveal each item as it enters the viewport.
    const itemTriggers = ScrollTrigger.batch(timeline.querySelectorAll(".tl-item"), {
      start: "top 85%",
      once: true,
      onEnter: (batch) => batch.forEach((el) => el.classList.add("in-view")),
    });

    // Draw the gradient line in proportion to scroll progress.
    const lineTrigger = ScrollTrigger.create({
      trigger: timeline,
      start: "top 70%",
      end: "bottom 70%",
      scrub: true,
      onUpdate: (self) => fill.setAttribute("y2", `${self.progress * 100}`),
    });

    return () => {
      itemTriggers.forEach((t) => t.kill());
      lineTrigger.kill();
    };
  }, []);

  return (
    <div className="experience-theatre space-y-12">
      <KineticHeading text={t.experience.title} />

      <div ref={timelineRef} className="experience-theatre__timeline relative max-w-3xl">
        {/* Drawn line */}
        <svg
          className="pointer-events-none absolute left-[18px] top-2 w-1.5"
          style={{ height: "calc(100% - 16px)", overflow: "visible" }}
          preserveAspectRatio="none"
          viewBox="0 0 6 100"
        >
          <line className="tl-line-bg" x1="3" y1="0" x2="3" y2="100" />
          <line ref={fillRef} className="tl-line-fill" x1="3" y1="0" x2="3" y2="0" />
        </svg>

        {t.experience.items.map((item, index) => (
          <div
            key={`${item.title}-${item.date}`}
            className="experience-theatre__item tl-item relative pb-12 pl-[70px] last:pb-0"
          >
            <span className="tl-marker absolute left-0 top-0 z-[2] flex h-[42px] w-[42px] items-center justify-center rounded-full border border-line-subtle bg-background text-[var(--accent)] [&_svg]:h-[17px] [&_svg]:w-[17px]">
              {experiencesData[index]?.icon}
            </span>

            <div className="rounded-xl border border-line-subtle bg-panel px-6 py-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
              <p className="mb-1.5 font-mono text-[11px] tracking-[0.08em] text-[var(--accent)]">
                {item.date}
              </p>
              <h3 className="font-display text-xl font-bold tracking-[-0.025em]">{item.title}</h3>
              <p className="mb-2.5 text-sm text-copy-muted">{item.location}</p>
              <p className="max-w-[640px] text-sm leading-7 text-copy-muted">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
