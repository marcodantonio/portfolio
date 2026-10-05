"use client";

import { useEffect, useRef, useState } from "react";
import KineticHeading from "@/components/kinetic-heading";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { subscribeScroll } from "@/lib/scroll-signal";
import { useLanguage } from "@/context/language-context";

const COMMAND = "cat profile.json";

/**
 * The original profile terminal is back, but it now enters through the shared
 * scroll signal instead of owning a second scroll listener/timeline.
 */
export default function About() {
  const { t } = useLanguage();
  const [typed, setTyped] = useState(COMMAND);
  const [typing, setTyping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const body = bodyRef.current;
    if (!card || !body || prefersReducedMotion()) return;

    const lines = gsap.utils.toArray<HTMLElement>(body.children);
    gsap.set(lines, { opacity: 0, x: -10 });

    let typeTimer: number | undefined;
    let revealTween: gsap.core.Tween | undefined;
    let started = false;

    const startTyping = () => {
      if (started) return;
      started = true;
      setTyped("");
      setTyping(true);
      let index = 0;

      const step = () => {
        index += 1;
        setTyped(COMMAND.slice(0, index));
        if (index < COMMAND.length) {
          typeTimer = window.setTimeout(step, 52);
          return;
        }
        setTyping(false);
        revealTween = gsap.to(lines, {
          opacity: 1,
          x: 0,
          duration: 0.42,
          ease: "expo.out",
          stagger: 0.075,
          delay: 0.1,
          overwrite: true,
        });
      };

      typeTimer = window.setTimeout(step, 240);
    };

    const unsubscribe = subscribeScroll(() => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.82 && rect.bottom > 0) startTyping();
    });

    return () => {
      unsubscribe();
      if (typeTimer) window.clearTimeout(typeTimer);
      revealTween?.kill();
      gsap.killTweensOf(lines);
      gsap.set(lines, { clearProps: "opacity,transform" });
    };
  }, []);

  return (
    <div className="profile-dossier space-y-10">
      <KineticHeading text={t.about.title} />

      <div className="profile-dossier__grid grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,390px)] lg:gap-16">
        <div className="space-y-4">
          {t.about.bio.map((paragraph, index) => (
            <p
              key={index}
              className="text-[15px] leading-[1.84] text-copy-muted [&_strong]:font-medium [&_strong]:text-foreground"
              dangerouslySetInnerHTML={{ __html: paragraph }}
            />
          ))}
        </div>

        <div
          ref={cardRef}
          className="profile-dossier__terminal overflow-hidden rounded-xl border border-line bg-[var(--surface)] font-mono"
        >
          <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            <span className="ml-2 text-[11px] text-copy-muted">{t.about.termTitle}</span>
          </div>
          <div className="space-y-1 p-5 text-[12px] leading-[2.02]">
            <div>
              <span className="text-[var(--accent)]">❯ </span>
              <span className="text-copy-muted">{typed}</span>
              {typing ? (
                <span
                  aria-hidden="true"
                  className="ml-0.5 inline-block h-[1em] w-[6px] translate-y-[1px] align-middle"
                  style={{ background: "var(--accent)", animation: "blinkCaret 1s step-end infinite" }}
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
