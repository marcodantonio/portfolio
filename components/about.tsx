"use client";

import { useEffect, useRef, useState } from "react";
import KineticHeading from "@/components/kinetic-heading";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { useLanguage } from "@/context/language-context";

const COMMAND = "cat profile.json";

export default function About() {
  const { t } = useLanguage();

  // SSR / no-JS / reduced-motion: render the full command up front so the real
  // text is always in the DOM. The effect only slices it down to animate.
  const [typed, setTyped] = useState(COMMAND);
  const [typing, setTyping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const body = bodyRef.current;
    if (!card || !body) return;
    if (prefersReducedMotion()) return;

    const lines = gsap.utils.toArray<HTMLElement>(body.children);
    // Hide the JSON body up front (DOM-only op, no React state) so it never
    // flashes before the typewriter reveals it.
    gsap.set(lines, { opacity: 0, x: -10 });

    let typeTimer: ReturnType<typeof setTimeout> | undefined;
    let revealTween: gsap.core.Tween | undefined;
    let started = false;

    const typeCommand = () => {
      setTyped("");
      setTyping(true);
      let i = 0;
      const step = () => {
        i += 1;
        setTyped(COMMAND.slice(0, i));
        if (i < COMMAND.length) {
          typeTimer = setTimeout(step, 55);
        } else {
          setTyping(false);
          revealTween = gsap.to(lines, {
            opacity: 1,
            x: 0,
            duration: 0.45,
            ease: "expo.out",
            stagger: 0.08,
            delay: 0.12,
            overwrite: true,
          });
        }
      };
      typeTimer = setTimeout(step, 320);
    };

    const trigger = ScrollTrigger.create({
      trigger: card,
      start: "top 82%",
      once: true,
      onEnter: () => {
        if (started) return;
        started = true;
        typeCommand();
      },
    });

    return () => {
      if (typeTimer) clearTimeout(typeTimer);
      revealTween?.kill();
      trigger.kill();
      gsap.killTweensOf(lines);
      // Restore the fully-revealed state on unmount.
      gsap.set(lines, { clearProps: "opacity,transform" });
      setTyped(COMMAND);
      setTyping(false);
    };
  }, []);

  return (
    <div className="space-y-12">
      <KineticHeading eyebrow={t.about.label} text={t.about.title} />

      <div className="grid gap-12 lg:grid-cols-[1fr_390px] lg:gap-20">
        <div data-reveal className="space-y-4">
          {t.about.bio.map((paragraph, i) => (
            <p
              key={i}
              className="text-base leading-[1.9] text-copy-muted [&_strong]:font-medium [&_strong]:text-foreground"
              dangerouslySetInnerHTML={{ __html: paragraph }}
            />
          ))}
        </div>

        <div
          ref={cardRef}
          data-reveal
          className="overflow-hidden rounded-xl border border-line bg-[var(--surface)] font-mono"
        >
          <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            <span className="ml-2 text-[11px] text-copy-muted">{t.about.termTitle}</span>
          </div>
          <div className="space-y-1 p-5 text-[12.5px] leading-[2.1]">
            <div>
              <span className="text-[var(--accent)]">❯ </span>
              <span className="text-copy-muted">{typed}</span>
              {typing ? (
                <span
                  aria-hidden="true"
                  className="ml-0.5 inline-block h-[1em] w-[6px] translate-y-[1px] align-middle"
                  style={{
                    background: "var(--accent)",
                    animation: "blinkCaret 1s step-end infinite",
                  }}
                />
              ) : null}
            </div>
            <div ref={bodyRef} className="space-y-1">
              <div className="text-copy-muted">{"{"}</div>
              <TermLine k="name" v={'"Marco D’Antonio"'} comma />
              <TermLine k="role" v={'"Software Dev + AI + Infra"'} comma />
              <TermLine k="base" v={'"Pescara"'} comma />
              <TermLine k="work" v={'"Netsons"'} comma />
              <TermLine k="edu" v={'"UnivAQ · Mar 2025"'} comma />
              <div className="pl-4">
                <span className="text-[#79C0FF]">&quot;ai&quot;</span>
                <span className="text-copy-muted">: [</span>
                <span className="text-[#A5D6FF]">&quot;YOLO&quot;</span>
                <span className="text-copy-muted">, </span>
                <span className="text-[#A5D6FF]">&quot;Apple Vision Pro&quot;</span>
                <span className="text-copy-muted">, </span>
                <span className="text-[#A5D6FF]">&quot;CI/CD&quot;</span>
                <span className="text-copy-muted">],</span>
              </div>
              <div className="pl-4">
                <span className="text-[#79C0FF]">&quot;available&quot;</span>
                <span className="text-copy-muted">: </span>
                <span className="text-[#A5D6FF]">true</span>
              </div>
              <div className="text-copy-muted">{"}"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TermLine({ k, v, comma }: { k: string; v: string; comma?: boolean }) {
  return (
    <div className="pl-4">
      <span className="text-[#79C0FF]">&quot;{k}&quot;</span>
      <span className="text-copy-muted">: </span>
      <span className="text-[#A5D6FF]">{v}</span>
      {comma ? <span className="text-copy-muted">,</span> : null}
    </div>
  );
}
