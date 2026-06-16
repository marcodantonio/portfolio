"use client";

import { useRef, useEffect, useState } from "react";
import {
  Eye,
  ShoppingBag,
  CalendarRange,
  Sparkles,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { projectsData } from "@/lib/data";
import { gsap } from "@/lib/gsap";
import KineticHeading from "@/components/kinetic-heading";
import { useLanguage } from "@/context/language-context";

const ICONS: LucideIcon[] = [Eye, ShoppingBag, CalendarRange, Sparkles, Globe];

// Evaluated once at module load — pointer media query doesn't change at runtime.
const isFinePointer =
  typeof window !== "undefined"
    ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
    : false;

function HoloCard({
  index,
  total,
  title,
  description,
  tags,
}: {
  index: number;
  total: number;
  title: string;
  description: string;
  tags: readonly string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const Icon = ICONS[index % ICONS.length];

  const tiltRef = useRef<{
    rx: (v: number) => void;
    ry: (v: number) => void;
    y: (v: number) => void;
  } | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !isFinePointer) return;
    gsap.set(node, { transformPerspective: 900 });
    const rx = gsap.quickTo(node, "rotationX", { duration: 0.4, ease: "power3.out" });
    const ry = gsap.quickTo(node, "rotationY", { duration: 0.4, ease: "power3.out" });
    const y = gsap.quickTo(node, "y", { duration: 0.4, ease: "power3.out" });
    tiltRef.current = { rx, ry, y };
    return () => {
      rx.tween.kill();
      ry.tween.kill();
      y.tween.kill();
      tiltRef.current = null;
    };
  }, []);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    const tilt = tiltRef.current;
    if (!node || !tilt || !isFinePointer) return;
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    node.style.setProperty("--mx", `${px * 100}%`);
    node.style.setProperty("--my", `${py * 100}%`);
    node.style.setProperty("--hop", "0.6");
    tilt.rx((py - 0.5) * -8);
    tilt.ry((px - 0.5) * 10);
    tilt.y(-5);
  };

  const reset = () => {
    const node = ref.current;
    const tilt = tiltRef.current;
    if (!node) return;
    node.style.setProperty("--hop", "0");
    if (tilt) {
      tilt.rx(0);
      tilt.ry(0);
      tilt.y(0);
    }
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      data-cursor="view"
      className="holo-card flex w-[clamp(280px,80vw,400px)] flex-shrink-0 flex-col rounded-2xl border border-line-subtle bg-surface p-8"
    >
      <p className="mb-5 font-mono text-[11px] tracking-[0.1em] text-copy-muted">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </p>
      <span
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: "var(--accent-soft)" }}
      >
        <Icon className="h-5 w-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
      </span>
      <h3 className="mb-2.5 font-display text-xl font-extrabold leading-tight tracking-[-0.03em]">
        {title}
      </h3>
      <p className="mb-5 flex-1 text-[13.5px] leading-relaxed text-copy-muted">{description}</p>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded border border-line-subtle px-2 py-0.5 font-mono text-[10px] text-copy-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

const FRICTION = 0.93;

export default function ProjectsRail() {
  const { t } = useLanguage();
  // outerRef  = the clip/cursor container (visible window)
  // trackRef  = the moving flex track (transform target)
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const txRef    = useRef(0); // current translateX in px
  const drag     = useRef({ active: false, startX: 0, startTx: 0 });
  const velocity = useRef(0);
  const lastPageX = useRef(0);
  const lastTime  = useRef(0);
  const rafId     = useRef<number>(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(false);
  const [pinActive, setPinActive] = useState(false);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  useEffect(() => {
    const outer = outerRef.current;
    const track = trackRef.current;
    if (!outer || !track) return;

    const mm = gsap.matchMedia();
    mm.add(
      "(hover: hover) and (pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const section = document.getElementById("projects");
        if (!section) return;
        pinnedRef.current = true;
        setPinActive(true);
        // Neutralize any leftover drag offset before the scrub takes over.
        gsap.set(track, { x: 0 });
        txRef.current = 0;
        const skewTo = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3.out" });
        const distance = () => track.scrollWidth - outer.clientWidth;
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (progressRef.current) {
                progressRef.current.style.transform = `scaleX(${self.progress})`;
              }
              // Subtle velocity-linked skew (clamped), eased back to 0.
              const skew = gsap.utils.clamp(-4, 4, self.getVelocity() / -350);
              skewTo(skew);
            },
            onLeave: () => skewTo(0),
            onLeaveBack: () => skewTo(0),
          },
        });
        return () => {
          pinnedRef.current = false;
          setPinActive(false);
          tween.scrollTrigger?.kill();
          tween.kill();
          gsap.set(track, { clearProps: "transform" });
          txRef.current = 0;
        };
      }
    );
    return () => mm.revert();
  }, []);

  const clamp = (v: number) => {
    const outer = outerRef.current;
    const track = trackRef.current;
    if (!outer || !track) return v;
    const min = -(track.scrollWidth - outer.offsetWidth);
    return Math.min(0, Math.max(min, v));
  };

  const applyTx = (v: number) => {
    txRef.current = v;
    if (trackRef.current) trackRef.current.style.transform = `translateX(${v}px)`;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pinnedRef.current) return;
    const outer = outerRef.current;
    if (!outer) return;
    cancelAnimationFrame(rafId.current);
    velocity.current = 0;
    drag.current = { active: true, startX: e.pageX, startTx: txRef.current };
    lastPageX.current = e.pageX;
    lastTime.current = performance.now();
    outer.setPointerCapture(e.pointerId);
    outer.classList.add("dragging");
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    e.preventDefault();
    const now = performance.now();
    const dt  = Math.max(now - lastTime.current, 1);
    const raw = ((e.pageX - lastPageX.current) / dt) * 16;
    velocity.current = velocity.current * 0.6 + raw * 0.4;
    lastPageX.current = e.pageX;
    lastTime.current  = now;
    applyTx(clamp(drag.current.startTx + (e.pageX - drag.current.startX)));
  };

  const stopDrag = () => {
    const outer = outerRef.current;
    if (!outer || !drag.current.active) return;
    drag.current.active = false;
    outer.classList.remove("dragging");
    const tick = () => {
      velocity.current *= FRICTION;
      if (Math.abs(velocity.current) < 0.4) return;
      applyTx(clamp(txRef.current + velocity.current));
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
  };

  return (
    <div className="space-y-8">
      <KineticHeading eyebrow={t.projects.label} text={t.projects.title} />

      <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.08em] text-copy-muted">
        <span
          className="h-px max-w-[200px] flex-1"
          style={{ background: "linear-gradient(to right, var(--accent), transparent)" }}
        />
        <span>{pinActive ? t.projects.scrollHint : t.projects.drag}</span>
      </div>

      {pinActive ? (
        <div className="rail-progress" aria-hidden="true">
          <div ref={progressRef} className="rail-progress-fill" />
        </div>
      ) : null}

      <div
        ref={outerRef}
        className="rail-outer -mx-6"
        data-cursor="drag"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        {/* Track: transform-driven scroll, overflow visible — shadows never clipped */}
        <div ref={trackRef} className="rail-track px-6">
          {t.projects.items.map((project, index) => (
            <HoloCard
              key={project.title}
              index={index}
              total={t.projects.items.length}
              title={project.title}
              description={project.description}
              tags={projectsData[index]?.tags ?? []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
