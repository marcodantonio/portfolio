"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BsArrowDownRight, BsDownload, BsGithub, BsLinkedin } from "react-icons/bs";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { getCvDownloadPath } from "@/lib/cv";
import { useBootReady } from "@/lib/boot-state";

const ctaButtonClass = "h-10 rounded-full px-5 text-[11px] font-semibold tracking-[0.12em]";

/**
 * Semantic hero copy over the one page-wide Three.js signal. It deliberately
 * owns the opening interaction only; scrolling the story itself stays with
 * JourneyCanvas rather than becoming a separate hero scene.
 */
export default function Intro() {
  const { lang, t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const entered = useBootReady();
  const cvHref = getCvDownloadPath(lang);

  return (
    <section id="hero-section" className="hero-stage w-full scroll-mt-28">
      <motion.div
        data-journey-anchor="0"
        className="hero-stage__content relative z-[2] mx-auto flex min-h-[100svh] w-full max-w-[1280px] flex-col justify-center px-6 pb-24 pt-32 sm:px-10 lg:px-6"
        initial={false}
        animate={reducedMotion || entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
          {t.hero.badge}
        </p>

        <h1
          aria-label="Marco D'Antonio"
          tabIndex={-1}
          className="hero-stage__title mt-5 max-w-[640px] font-display text-[clamp(3.1rem,6.8vw,7.5rem)] font-black leading-[0.82] tracking-[-0.075em] text-foreground max-[480px]:text-[3rem]"
        >
          <span aria-hidden="true">
            Marco<br />
            <span className="text-[var(--accent)]">D&apos;Antonio</span>
          </span>
        </h1>

        <p className="hero-stage__roles mt-6 min-h-[1.6em] font-mono text-[12px] tracking-[0.07em] text-copy-muted sm:text-sm">
          {t.hero.roles.slice(1, 3).join(" · ")}
        </p>

        <div className="hero-stage__summary mt-5 max-w-sm border-l border-[color-mix(in_srgb,var(--accent)_55%,transparent)] pl-4">
          <p className="font-mono text-[11px] leading-6 tracking-[0.04em] text-copy-muted sm:text-[12px]">{t.journey.stages[0].detail}</p>
        </div>

        <div className="hero-stage__actions mt-9 flex flex-wrap items-center gap-3">
          <Button asChild size="default" className={ctaButtonClass}>
            <a href="#projects">
              {t.hero.ctaWork}
              <BsArrowDownRight size={14} />
            </a>
          </Button>

          <Button asChild variant="outline" size="default" className={`${ctaButtonClass} border-line bg-panel-strong text-foreground hover:bg-accent-soft`}>
            <a href={cvHref} download>
              {t.hero.ctaCV}
              <BsDownload size={13} />
            </a>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="rounded-full border-line bg-panel-strong text-foreground hover:bg-accent-soft"
            onClick={() => window.dispatchEvent(new Event("personai:open"))}
            aria-label={t.journey.ai.open}
          >
            <MessageCircle size={17} />
          </Button>

          <Button asChild variant="outline" size="icon-lg" className="rounded-full border-line bg-panel-strong text-foreground hover:bg-accent-soft">
            <a href="https://linkedin.com/in/marcodantonio00" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <BsLinkedin size={17} />
            </a>
          </Button>

          <Button asChild variant="outline" size="icon-lg" className="rounded-full border-line bg-panel-strong text-foreground hover:bg-accent-soft">
            <a href="https://github.com/marcodantonio" target="_blank" rel="noreferrer" aria-label="GitHub">
              <BsGithub size={17} />
            </a>
          </Button>
        </div>

        <p className="hero-stage__scroll mt-12 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-copy-muted">
          <span aria-hidden="true" className="h-px w-8 bg-[var(--accent)] opacity-70" />
          {t.hero.scroll}
        </p>
      </motion.div>
    </section>
  );
}
