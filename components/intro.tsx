"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { BsArrowRight, BsDownload, BsLinkedin } from "react-icons/bs";
import { FaGithubSquare } from "react-icons/fa";
import TypedText from "@/components/typed-text";
import Magnetic from "@/components/magnetic";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { getCvDownloadPath } from "@/lib/cv";

const HeroCanvas = dynamic(() => import("@/components/hero-canvas"), { ssr: false });
const HeroMiniChatSkeleton = ({ sublabel, placeholder }: { sublabel: string; placeholder: string }) => (
  <div data-chat-widget className="chat-win w-full max-w-[min(96vw,620px)] pointer-events-auto">
    <div className="chat-hdr flex items-center gap-2.5 px-4 py-3">
      <span
        className="h-[7px] w-[7px] flex-shrink-0 rounded-full"
        style={{ background: "#28C840", boxShadow: "0 0 6px #28C840", animation: "pulseDot 2.5s ease infinite" }}
      />
      <span className="chat-hdr-title font-mono text-[13px] font-medium">marco.ai</span>
      <span className="chat-hdr-sub ml-auto hidden font-mono text-[10.5px] sm:block">{sublabel}</span>
    </div>
    <div className="flex flex-col gap-2.5 overflow-y-auto px-4 py-3.5" style={{ height: "160px", scrollbarWidth: "thin" }}>
      <div className="chat-msg-ai max-w-[85%] self-start rounded-[10px] px-3 py-2 text-[13px] leading-relaxed [border-bottom-left-radius:3px] opacity-70">
        ...
      </div>
      <div className="chat-msg-ai max-w-[85%] self-start rounded-[10px] px-3 py-2 text-[13px] leading-relaxed [border-bottom-left-radius:3px] opacity-45">
        ...
      </div>
    </div>
    <div className="flex flex-wrap gap-1.5 px-3.5 py-2" style={{ borderTop: "1px solid rgba(124,107,255,0.1)" }}>
      <span className="chat-chip rounded-full px-3 py-1.5 font-mono text-[10.5px] opacity-60">...</span>
      <span className="chat-chip rounded-full px-3 py-1.5 font-mono text-[10.5px] opacity-60">...</span>
    </div>
    <div className="chat-foot flex items-center gap-2.5 px-3.5 py-2.5">
      <div className="chat-in flex-1 rounded-[7px] px-3 py-2 text-[13.5px] opacity-50">{placeholder}</div>
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[7px]" style={{ background: "var(--accent)" }} />
    </div>
  </div>
);

const HeroMiniChat = dynamic(() => import("@/components/hero-mini-chat"), { ssr: false });
const ctaButtonClass = "h-10 rounded-full px-5 text-[13px] font-semibold tracking-[0.14em]";

export default function Intro() {
  const { lang, t } = useLanguage();
  const innerRef = useRef<HTMLDivElement>(null);
  const revealedRef = useRef(true);
  const [chatReady, setChatReady] = useState(false);
  const cvHref = getCvDownloadPath(lang);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const inner = innerRef.current;
    const hero = document.getElementById("hero-section");

    // First-visit formation: keep the hero content hidden while the particles
    // assemble into the name, then fade it in as they disperse.
    const willForm = !reduced && !sessionStorage.getItem("heroFormed");
    let revealTimer: ReturnType<typeof setTimeout> | number | undefined;
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;
    let trigger: ScrollTrigger | undefined;
    const startReveal = () => {
      if (!inner || revealedRef.current) return;
      revealedRef.current = true;
      inner.style.transition =
        "opacity 0.96s cubic-bezier(0.16, 1, 0.3, 1), transform 0.96s cubic-bezier(0.16, 1, 0.3, 1)";
      inner.style.opacity = "1";
      inner.style.transform = "none";
      revealTimer = setTimeout(() => {
        if (inner) inner.style.transition = "";
      }, 1020);
    };
    const onPhase = (event: Event) => {
      const phase = (event as CustomEvent<{ phase: string }>).detail?.phase;
      if (phase === "disperse") {
        revealTimer = window.setTimeout(startReveal, 150);
      }
    };
    if (willForm && inner) {
      revealedRef.current = false;
      inner.style.opacity = "0";
      inner.style.transform = "translateY(24px)";
      window.addEventListener("hero:phase", onPhase);
      window.addEventListener("hero:formation-complete", startReveal, { once: true });
      // Safety net: if the canvas never runs (no WebGL, chunk load failure),
      // reveal the content anyway instead of leaving an empty hero.
      safetyTimer = setTimeout(startReveal, 6000);
    }

    // Scroll-linked parallax-out (only after the content is revealed).
    if (!reduced && hero && inner) {
      trigger = ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          if (!revealedRef.current) return;
          inner.style.transform = `translateY(${self.progress * -70}px)`;
          inner.style.opacity = `${Math.max(0, 1 - self.progress * 1.15)}`;
        },
      });
    }

    return () => {
      trigger?.kill();
      if (revealTimer) clearTimeout(revealTimer);
      if (safetyTimer) clearTimeout(safetyTimer);
      window.removeEventListener("hero:phase", onPhase);
      window.removeEventListener("hero:formation-complete", startReveal);
    };
  }, []);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const delay = reduced ? 0 : 1200;
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idle = win.requestIdleCallback
      ? win.requestIdleCallback(() => setChatReady(true))
      : win.setTimeout(() => setChatReady(true), delay);

    return () => {
      if (typeof idle === "number") {
        win.clearTimeout(idle);
      } else {
        win.cancelIdleCallback?.(idle);
      }
    };
  }, []);

  return (
    <section
      id="hero-section"
      className="hero-stage w-full"
    >
      {/* Three.js particle background (hero only) */}
      <HeroCanvas />

      {/* Ambient orbs */}
      <div
        className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(124,107,255,0.14) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "orbDrift 12s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute bottom-[-5%] right-[5%] w-[380px] h-[380px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(88,166,255,0.09) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "orbDrift 15s ease-in-out infinite alternate-reverse",
        }}
      />
      <div
        className="absolute top-[40%] right-[20%] w-[260px] h-[260px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,212,170,0.07) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "orbDrift 10s ease-in-out infinite alternate",
        }}
      />

      {/* Hero content */}
      <div
        ref={innerRef}
        className="hero-stage__content relative z-10 flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 pb-24 pt-28 text-center will-change-[transform,opacity]"
      >

        {/* Badge */}
        <div
          className="hero-entry flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em]"
          style={{ color: "var(--accent)", animation: "heroFadeUp 0.5s var(--ease-out) both" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 10px var(--accent)",
              animation: "pulseDot 2s ease infinite",
            }}
          />
          {t.hero.badge}
        </div>

        {/* Name */}
        <h1
          aria-label="Marco D'Antonio"
          className="hero-stage__title hero-entry font-display font-black leading-[0.92] tracking-[-0.05em] text-foreground"
          style={{
            fontSize: "clamp(52px, 8vw, 100px)",
            animation: "heroRise 0.7s ease 0.1s both, heroFade 0.4s ease 0.05s both",
          }}
        >
          <span aria-hidden="true">
            Marco<br />
            <span style={{ color: "var(--accent)" }}>D&apos;Antonio</span>
          </span>
        </h1>

        {/* Typed subtitle */}
        <p
          className="hero-entry font-mono text-copy-muted min-h-[1.6em]"
          style={{ fontSize: "clamp(12px, 1.6vw, 16px)", animation: "heroFade 0.4s ease 0.2s both" }}
        >
          <TypedText roles={t.hero.roles} />
        </p>

        {/* Chat widget */}
        <div
          className="hero-stage__chat hero-entry w-full flex justify-center"
          style={{ animation: "heroFadeUp 0.5s var(--ease-out) 0.35s both" }}
        >
          {chatReady ? (
            <HeroMiniChat />
          ) : (
            <HeroMiniChatSkeleton sublabel={t.hero.chatSub} placeholder={t.hero.chatPlaceholder} />
          )}
        </div>

        {/* CTAs */}
        <div
          className="hero-entry flex flex-wrap items-center justify-center gap-3 mt-2"
          style={{ animation: "heroFadeUp 0.45s var(--ease-out) 0.5s both" }}
        >
          <Magnetic strength={0.38} radius={120}>
            <Button asChild size="default" className={ctaButtonClass}>
              <a href="#contact">
                {t.hero.ctaWork}
                <BsArrowRight size={14} />
              </a>
            </Button>
          </Magnetic>

          <Button asChild variant="outline" size="default" className={`${ctaButtonClass} border-line bg-panel-strong text-foreground hover:bg-accent-soft`}>
            <a href={cvHref} download>
              {t.hero.ctaCV}
              <BsDownload size={14} />
            </a>
          </Button>

          <Button asChild variant="outline" size="icon-lg" className="rounded-full border-line bg-panel-strong text-foreground hover:bg-accent-soft">
            <a href="https://linkedin.com/in/marcodantonio00" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <BsLinkedin size={18} />
            </a>
          </Button>

          <Button asChild variant="outline" size="icon-lg" className="rounded-full border-line bg-panel-strong text-foreground hover:bg-accent-soft">
            <a href="https://github.com/marcodantonio" target="_blank" rel="noreferrer" aria-label="GitHub">
              <FaGithubSquare size={19} />
            </a>
          </Button>
        </div>
      </div>

      {/* Scroll hint — only shown when the viewport is tall enough to avoid the CTAs */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-0 hidden -translate-x-1/2 flex-col items-center gap-2 [@media(min-height:940px)]:flex">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-copy-muted">
          {t.hero.scroll}
        </span>
        <div
          className="w-px h-10"
          style={{
            background: "linear-gradient(to bottom, var(--accent), transparent)",
            animation: "pulseDot 2.2s ease-in-out infinite",
          }}
        />
      </div>
    </section>
  );
}
