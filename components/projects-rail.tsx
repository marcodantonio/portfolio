"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Eye, Globe, ShoppingBag, Sparkles, type LucideIcon } from "lucide-react";
import { projectsData } from "@/lib/data";
import { gsap } from "@/lib/gsap";
import KineticHeading from "@/components/kinetic-heading";
import { useLanguage } from "@/context/language-context";

const ICONS: LucideIcon[] = [Eye, ShoppingBag, CalendarRange, Sparkles, Globe];
const FRICTION = 0.93;

function HoloCard({
  index,
  title,
  description,
  proof,
  proofLabels,
  tags,
  active,
  onActivate,
}: {
  index: number;
  title: string;
  description: string;
  proof: { role: string; output: string };
  proofLabels: { role: string; output: string };
  tags: readonly string[];
  active: boolean;
  onActivate: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const Icon = ICONS[index % ICONS.length];
  const tiltRef = useRef<{ rx: (value: number) => void; ry: (value: number) => void; y: (value: number) => void } | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
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

  const handleMove = (event: MouseEvent<HTMLElement>) => {
    const node = ref.current;
    const tilt = tiltRef.current;
    if (!node || !tilt) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    node.style.setProperty("--mx", `${x * 100}%`);
    node.style.setProperty("--my", `${y * 100}%`);
    node.style.setProperty("--hop", "0.6");
    tilt.rx((y - 0.5) * -8);
    tilt.ry((x - 0.5) * 10);
    tilt.y(-5);
  };

  const reset = () => {
    const node = ref.current;
    const tilt = tiltRef.current;
    if (!node) return;
    node.style.setProperty("--hop", "0");
    tilt?.rx(0);
    tilt?.ry(0);
    tilt?.y(0);
  };

  return (
    <article
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      data-cursor="view"
      className={`holo-card flex w-[clamp(288px,68vw,500px)] flex-shrink-0 flex-col rounded-2xl border border-line-subtle bg-surface p-7 lg:min-h-[390px] lg:p-9${active ? " is-active" : ""}`}
    >
      <span aria-hidden="true" className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
        <Icon className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.5} />
      </span>
      <h3 className="mb-2.5 font-display text-xl font-extrabold leading-tight tracking-[-0.03em]">{title}</h3>
      <p className="mb-5 text-[13.5px] leading-relaxed text-copy-muted">{description}</p>
      <dl className="project-proof mb-5">
        <div className="project-proof__row"><dt>{proofLabels.role}</dt><dd>{proof.role}</dd></div>
        <div className="project-proof__row"><dt>{proofLabels.output}</dt><dd>{proof.output}</dd></div>
      </dl>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {tags.slice(0, 4).map((tag) => <span key={tag} className="rounded border border-line-subtle px-2 py-0.5 font-mono text-[10px] text-copy-muted">{tag}</span>)}
      </div>
    </article>
  );
}

/**
 * The rail keeps its direct drag, inertia and card tilt. It intentionally does
 * not pin itself on scroll: the page-wide Three scene remains the only
 * scroll-evolving animation.
 */
export default function ProjectsRail() {
  const { t } = useLanguage();
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const txRef = useRef(0);
  const drag = useRef({ active: false, startX: 0, startTx: 0 });
  const velocity = useRef(0);
  const lastPageX = useRef(0);
  const lastTime = useRef(0);
  const rafId = useRef<number>(0);
  const [activeProject, setActiveProject] = useState(0);

  useEffect(() => () => window.cancelAnimationFrame(rafId.current), []);

  const bounds = () => {
    const outer = outerRef.current;
    const track = trackRef.current;
    if (!outer || !track) return { min: 0, max: 0 };
    return { min: Math.min(0, outer.clientWidth - track.scrollWidth), max: 0 };
  };

  const applyTx = (value: number) => {
    const { min, max } = bounds();
    const next = Math.min(max, Math.max(min, value));
    txRef.current = next;
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${next}px, 0, 0)`;
    const progress = min === 0 ? 0 : Math.min(1, Math.max(0, next / min));
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    const index = Math.round(progress * (t.projects.items.length - 1));
    setActiveProject((current) => current === index ? current : index);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const outer = outerRef.current;
    if (!outer) return;
    window.cancelAnimationFrame(rafId.current);
    velocity.current = 0;
    drag.current = { active: true, startX: event.pageX, startTx: txRef.current };
    lastPageX.current = event.pageX;
    lastTime.current = performance.now();
    outer.setPointerCapture(event.pointerId);
    outer.classList.add("dragging");
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    event.preventDefault();
    const now = performance.now();
    const delta = ((event.pageX - lastPageX.current) / Math.max(now - lastTime.current, 1)) * 16;
    velocity.current = velocity.current * 0.6 + delta * 0.4;
    lastPageX.current = event.pageX;
    lastTime.current = now;
    applyTx(drag.current.startTx + event.pageX - drag.current.startX);
  };

  const stopDrag = () => {
    const outer = outerRef.current;
    if (!outer || !drag.current.active) return;
    drag.current.active = false;
    outer.classList.remove("dragging");
    const tick = () => {
      velocity.current *= FRICTION;
      if (Math.abs(velocity.current) < 0.4) return;
      applyTx(txRef.current + velocity.current);
      rafId.current = window.requestAnimationFrame(tick);
    };
    rafId.current = window.requestAnimationFrame(tick);
  };

  const nudge = (direction: -1 | 1) => {
    const outer = outerRef.current;
    if (!outer) return;
    applyTx(txRef.current - direction * Math.max(outer.clientWidth * 0.72, 300));
  };

  return (
    <div className="projects-cinematic space-y-8">
      <KineticHeading text={t.projects.title} />

      <div className="projects-cinematic__meta">
        <div className="flex min-w-0 items-center gap-3 font-mono text-[11px] tracking-[0.08em] text-copy-muted">
          <span aria-hidden="true" className="h-px max-w-[200px] flex-1 bg-[linear-gradient(to_right,var(--accent),transparent)]" />
          <span>{t.projects.drag}</span>
        </div>
        <div className="projects-cinematic__active"><strong>{t.projects.items[activeProject]?.title}</strong></div>
        <div className="flex items-center gap-2">
          <button type="button" className="rail-nav-button" onClick={() => nudge(-1)} aria-label="Previous project"><ChevronLeft size={16} /></button>
          <button type="button" className="rail-nav-button" onClick={() => nudge(1)} aria-label="Next project"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="rail-progress" aria-hidden="true"><div ref={progressRef} className="rail-progress-fill" /></div>

      <div
        ref={outerRef}
        className="rail-outer -mx-6"
        data-cursor="drag"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <div ref={trackRef} className="rail-track px-6">
          {t.projects.items.map((project, index) => (
            <HoloCard
              key={project.title}
              index={index}
              title={project.title}
              description={project.description}
              proof={project.proof}
              proofLabels={t.projects.proofLabels}
              tags={projectsData[index]?.tags ?? []}
              active={index === activeProject}
              onActivate={() => setActiveProject(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
