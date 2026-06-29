"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import KineticHeading from "@/components/kinetic-heading";
import { useLanguage } from "@/context/language-context";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";

type EduId = "bsc" | "thesis" | "msc";

type Edu = {
  id: EduId;
  ongoing: boolean;
  city: string;
  coord: string;
  pin: { left: string; top: string; place: "top" | "bot" };
};

// Non-translatable structure (geography, status); text comes from i18n.
const EDUCATION: Edu[] = [
  {
    id: "msc",
    ongoing: true,
    city: "Torino",
    coord: "45.07°N · 7.69°E",
    pin: { left: "39%", top: "27.6%", place: "top" },
  },
  {
    id: "bsc",
    ongoing: false,
    city: "L'Aquila",
    coord: "42.35°N · 13.40°E",
    pin: { left: "58%", top: "48.5%", place: "bot" },
  },
  {
    id: "thesis",
    ongoing: false,
    city: "Pescara",
    coord: "42.46°N · 14.21°E",
    pin: { left: "70%", top: "58.5%", place: "bot" },
  },
];

const ITALY_DOTS: Array<[number, number]> = [
  [78, 58], [84, 62], [90, 60], [96, 65], [102, 68], [92, 74], [98, 80],
  [104, 86], [110, 94], [116, 102], [122, 110], [128, 118], [134, 126],
  [140, 138], [138, 148], [132, 156], [125, 162], [116, 160], [105, 155],
  [86, 170], [76, 172], [68, 168],
];

export default function Education() {
  const [active, setActive] = useState<string | null>(null);
  const { t } = useLanguage();
  const radarRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  // Pulsing dot travels the L'Aquila ↔ Pescara/Torino arc. Only runs while the
  // radar is on screen (no off-screen forever-loop); static under reduced motion.
  useEffect(() => {
    const dot = dotRef.current;
    const radar = radarRef.current;
    if (!dot || !radar) return;

    if (prefersReducedMotion()) {
      // Park the dot at the arc start and skip the tween entirely.
      gsap.set(dot, { motionPath: { path: "#edu-arc", align: "#edu-arc", alignOrigin: [0.5, 0.5], start: 0, end: 0 } });
      return;
    }

    const travel = gsap.to(dot, {
      duration: 2.8,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
      paused: true,
      motionPath: { path: "#edu-arc", align: "#edu-arc", alignOrigin: [0.5, 0.5] },
    });

    // Subtle pulse so the traveller breathes as it moves.
    const pulse = gsap.to(dot, {
      scale: 1.45,
      transformOrigin: "50% 50%",
      duration: 0.9,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      paused: true,
    });

    const trigger = ScrollTrigger.create({
      trigger: radar,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => {
        travel.play();
        pulse.play();
      },
      onLeave: () => {
        travel.pause();
        pulse.pause();
      },
      onEnterBack: () => {
        travel.play();
        pulse.play();
      },
      onLeaveBack: () => {
        travel.pause();
        pulse.pause();
      },
    });

    return () => {
      trigger.kill();
      travel.kill();
      pulse.kill();
    };
  }, []);

  return (
    <div className="education-radar-stage space-y-12">
      <KineticHeading text={t.education.title} />

      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Radar map */}
        <div ref={radarRef} className="education-radar-stage__radar relative mx-auto w-full max-w-[420px]" style={{ aspectRatio: "1 / 1.05" }}>
          <svg viewBox="0 0 200 210" className="block h-full w-full">
            <defs>
              <radialGradient id="radarBg">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.06" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <rect width="200" height="210" fill="url(#radarBg)" />
            <circle className="radar-ring" cx="100" cy="105" r="92" />
            <circle className="radar-ring dash" cx="100" cy="105" r="70" />
            <circle className="radar-ring" cx="100" cy="105" r="48" />
            <circle className="radar-ring dash" cx="100" cy="105" r="26" />
            <line className="radar-cross" x1="0" y1="105" x2="200" y2="105" />
            <line className="radar-cross" x1="100" y1="0" x2="100" y2="210" />
            <g className="radar-sweep">
              <path d="M100,105 L100,13 A92,92 0 0 1 178,55 Z" fill="var(--accent)" opacity="0.08" />
            </g>
            <g fill="var(--muted)" opacity="0.5">
              {ITALY_DOTS.map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="1" />
              ))}
            </g>
            <path className="radar-arc-glow" d="M 78,58 Q 95,75 116,102" />
            <path id="edu-arc" className="radar-arc" d="M 78,58 Q 95,75 116,102" />
            {/* Pulsing traveller dot — animated along #edu-arc via GSAP MotionPath */}
            <circle ref={dotRef} className="radar-traveller" r="2.4" cx="78" cy="58" fill="var(--accent)" />
          </svg>

          {EDUCATION.map((edu) => (
            <div
              key={edu.id}
              className={`edu-pin ${edu.pin.place}${active === edu.id ? " hl" : ""}`}
              style={{ left: edu.pin.left, top: edu.pin.top }}
              onMouseEnter={() => setActive(edu.id)}
              onMouseLeave={() => setActive(null)}
            >
              <div className="edu-pin-mark" />
              <div className="edu-pin-label">
                {edu.city}
                <span className="edu-pin-coord">{edu.coord}</span>
              </div>
            </div>
          ))}

          <div className="edu-distance">{t.education.distance}</div>
        </div>

        {/* Cards */}
        <div className="education-radar-stage__cards flex flex-col gap-4">
          {EDUCATION.map((edu) => {
            const text = t.education.items[edu.id];
            return (
            <article
              key={edu.id}
              onMouseEnter={() => setActive(edu.id)}
              onMouseLeave={() => setActive(null)}
              className="education-radar-stage__card group relative overflow-hidden rounded-xl border border-line-subtle bg-panel px-7 py-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
            >
              <span className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-300 group-hover:scale-x-100" />
              <div className="mb-4 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
                  style={{
                    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                    color: "var(--accent)",
                    borderColor: "transparent",
                  }}
                >
                  {edu.id === "bsc"
                    ? t.education.bsc
                    : edu.id === "thesis"
                      ? t.education.thesis
                      : t.education.msc}
                </Badge>
                <span
                  className="ml-auto font-mono text-[10px]"
                  style={{ color: edu.ongoing ? "#28C840" : "var(--copy-muted)" }}
                >
                  {edu.ongoing ? t.education.ongoing : t.education.done}
                </span>
              </div>
              <h3 className="font-display text-xl font-bold leading-tight tracking-[-0.025em]">
                {text.degree}
              </h3>
              <p className="mt-1 text-sm text-copy-muted">{text.school}</p>
              <p className="mb-3.5 mt-2.5 font-mono text-[11px] text-[var(--accent)]">{text.focus}</p>
              <div className="flex flex-wrap gap-1.5">
                {text.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded font-mono text-[11px]"
                    style={{
                      padding: "4px 11px",
                      background: "var(--accent-soft)",
                      color: "var(--muted)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
