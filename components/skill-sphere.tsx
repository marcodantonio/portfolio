"use client";

import { useEffect, useMemo, useRef } from "react";

export type SphereSkill = { label: string; category: string };

type SkillSphereProps = {
  skills: SphereSkill[];
  /** Category key to highlight; tags outside it dim. `null` shows all. */
  activeCategory: string | null;
  size?: number;
};

type TagPoint = { x0: number; y0: number; z0: number };

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Rotating 3D sphere of skill tags positioned on a Fibonacci lattice.
 * Auto-rotates, follows the cursor, and dims/glows tags by category.
 * All per-frame work is imperative (no React re-renders in the loop).
 */
export default function SkillSphere({ skills, activeCategory, size = 380 }: SkillSphereProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rotRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cssSize = `min(${size}px, calc(100vw - 3rem))`;
  const displaySkills = useMemo(() => {
    return [...skills].sort((a, b) => hashString(`${a.category}:${a.label}`) - hashString(`${b.category}:${b.label}`));
  }, [skills]);

  // Fibonacci lattice positions — stable for the component lifetime. The
  // display order is shuffled separately so categories do not cluster.
  const points = useMemo<TagPoint[]>(() => {
    const n = displaySkills.length;
    return displaySkills.map((_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        x0: Math.sin(phi) * Math.cos(theta),
        y0: Math.sin(phi) * Math.sin(theta),
        z0: Math.cos(phi),
      };
    });
  }, [displaySkills]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const rot = rotRef.current;
    if (!wrap || !rot) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rotX = 0;
    let rotY = 0;
    let velX = 0;
    let velY = 0;
    const autoSpinY = 0.0028;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastMoveAt = 0;
    let rafId: number;

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      wrap.classList.add("dragging");
      lastX = event.clientX;
      lastY = event.clientY;
      lastMoveAt = performance.now();
      wrap.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        const now = performance.now();
        const dt = Math.max(16, now - lastMoveAt);
        lastX = event.clientX;
        lastY = event.clientY;
        lastMoveAt = now;

        rotY += dx * 0.0085;
        rotX -= dy * 0.0065;

        const nextVelY = (dx / dt) * 0.22;
        const nextVelX = (-dy / dt) * 0.18;
        velY = velY * 0.6 + nextVelY * 0.4;
        velX = velX * 0.6 + nextVelX * 0.4;
      }
    };
    const stopDragging = () => {
      dragging = false;
      wrap.classList.remove("dragging");
    };
    const onPointerLeave = () => {
      if (!dragging) {
        velX *= 0.5;
        velY *= 0.5;
      }
    };
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerup", stopDragging);
    wrap.addEventListener("pointercancel", stopDragging);
    wrap.addEventListener("pointerleave", onPointerLeave);

    const radius = () => Math.min(rot.clientWidth, rot.clientHeight) * 0.42;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      if (!reduce) {
        if (!dragging) {
          rotY += autoSpinY;
          rotX += velX;
          rotY += velY;
          velX *= 0.972;
          velY *= 0.972;
          if (Math.abs(velX) < 0.000015) velX = 0;
          if (Math.abs(velY) < 0.000015) velY = 0;
        }
      }

      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const r = radius();

      points.forEach((p, i) => {
        const el = tagRefs.current[i];
        if (!el) return;
        // rotate around Y then X
        const x = p.x0 * cosY + p.z0 * sinY;
        const zr = -p.x0 * sinY + p.z0 * cosY;
        const y = p.y0 * cosX - zr * sinX;
        const z = p.y0 * sinX + zr * cosX;
        const depth = (z + 1) / 2; // 0 back → 1 front
        el.style.transform = `translate3d(${x * r}px, ${y * r}px, ${z * r}px) translate(-50%, -50%) scale(${0.55 + depth * 0.55})`;
        el.style.opacity = `${0.25 + depth * 0.75}`;
        el.style.zIndex = `${Math.round(depth * 100)}`;
      });
    };
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerup", stopDragging);
      wrap.removeEventListener("pointercancel", stopDragging);
      wrap.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [points]);

  return (
    <div
      ref={wrapRef}
      className="tag-sphere"
      style={{ width: cssSize, height: cssSize }}
    >
      <div ref={rotRef} className="tag-sphere-rot">
        {displaySkills.map((skill, i) => {
          const active = activeCategory === null || skill.category === activeCategory;
          const glow = activeCategory !== null && skill.category === activeCategory;
          return (
            <div
              key={`${skill.label}-${i}`}
              ref={(el) => { tagRefs.current[i] = el; }}
              className={`sphere-tag${glow ? " glow" : ""}${!active ? " dim" : ""}`}
            >
              {skill.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
