"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { skillsData } from "@/lib/data";
import KineticHeading from "@/components/kinetic-heading";
import { useLanguage } from "@/context/language-context";
import type { SphereSkill } from "@/components/skill-sphere";

const LazySkillSphere = dynamic(() => import("@/components/skill-sphere"), { ssr: false });

function SkillSphereShell() {
  return (
    <div
      className="tag-sphere ds-panel ds-panel--strong relative flex items-center justify-center overflow-hidden"
      style={{ width: "min(380px, calc(100vw - 3rem))", height: "min(380px, calc(100vw - 3rem))" }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent_58%)]" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <span className="h-14 w-14 rounded-full border border-line-subtle bg-accent-soft shadow-[0_0_36px_color-mix(in_srgb,var(--accent)_18%,transparent)]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-copy-muted">loading skills</span>
      </div>
    </div>
  );
}

/** Interactive Fibonacci skills sphere plus the original category reveal controls. */
export default function Skills() {
  const [active, setActive] = useState<string | null>(null);
  const [sphereReady, setSphereReady] = useState(false);
  const sphereHostRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const sphereSkills = useMemo<SphereSkill[]>(
    () => skillsData.flatMap((group) => group.skills.map((label) => ({ label, category: group.category }))),
    []
  );

  useEffect(() => {
    const node = sphereHostRef.current;
    if (!node || sphereReady) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSphereReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "220px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [sphereReady]);

  return (
    <div className="skills-machine space-y-10">
      <KineticHeading text={t.skills.title} />

      <div className="skills-machine__grid grid items-center gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-14">
        <div ref={sphereHostRef} className="skills-machine__sphere flex justify-center">
          {sphereReady ? <LazySkillSphere skills={sphereSkills} activeCategory={active} /> : <SkillSphereShell />}
        </div>

        <div className="skills-machine__groups flex flex-col gap-3">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-copy-muted">{t.skills.hint}</p>
          {skillsData.map((group) => {
            const isActive = active === group.category;
            return (
              <button
                key={group.category}
                type="button"
                aria-expanded={isActive}
                onMouseEnter={() => setActive(group.category)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(group.category)}
                onBlur={() => setActive(null)}
                className="group relative overflow-hidden rounded-xl border border-line-subtle bg-panel-strong px-5 py-4 text-left transition-[transform,border-color,box-shadow] duration-300 hover:translate-x-1.5 hover:border-[var(--accent)] focus-visible:translate-x-1.5 focus-visible:border-[var(--accent)] focus-visible:outline-none"
              >
                <span
                  className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-[var(--accent)] transition-transform duration-300 group-hover:scale-y-100 group-focus-visible:scale-y-100"
                  style={isActive ? { transform: "scaleY(1)" } : undefined}
                />
                <span className="flex items-center gap-2.5 font-display text-sm font-bold text-[var(--accent)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                  {t.skills.categories[group.category]}
                </span>
                <span className="mt-1.5 block font-mono text-[10.5px] tracking-[0.04em] text-copy-muted">
                  {group.skills.length} {t.skills.skills}
                </span>
                <span className="skill-reveal" data-open={isActive}>
                  <span className="skill-reveal__inner">
                    <span className="skill-reveal__chips">
                      {group.skills.map((skill) => <span key={skill} className="skill-chip">{skill}</span>)}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
