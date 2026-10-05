"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { completeBoot, isBootComplete } from "@/lib/boot-state";

const INTRO_DURATION = 2_450;
const EXIT_DURATION = 650;

/** An optional first-visit introduction, never a fake backend loading screen. */
export default function BootSequence() {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<"pending" | "leaving" | "hidden">("pending");
  const skipRef = useRef<HTMLButtonElement>(null);
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let finished = false;
    let hideTimer: number | undefined;
    let focusFrame: number | undefined;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const deadline = performance.now() + INTRO_DURATION;

    const finish = (immediate = false) => {
      if (disposed || finished) return;
      finished = true;
      const ownsFocus = document.activeElement === skipRef.current;
      completeBoot();
      setPhase(immediate ? "hidden" : "leaving");
      if (!immediate) hideTimer = window.setTimeout(() => setPhase("hidden"), EXIT_DURATION);
      if (ownsFocus) {
        // React must remove the content's inert attribute before returning focus.
        focusFrame = window.requestAnimationFrame(() => {
          document.querySelector<HTMLElement>("#island-title, #hero-section h1")?.focus({ preventScroll: true });
        });
      }
    };

    finishRef.current = () => finish(motionPreference.matches);
    let visited = isBootComplete();
    try {
      visited ||= window.sessionStorage.getItem("booted") === "1";
    } catch {
      // Private browsing/storage restrictions only affect remembering the intro.
    }

    const setupTimer = window.setTimeout(() => {
      if (visited || motionPreference.matches) finish(true);
      else skipRef.current?.focus({ preventScroll: true });
    }, 0);
    const finishTimer = window.setTimeout(() => finish(), INTRO_DURATION);
    const onMotionChange = () => { if (motionPreference.matches) finish(true); };
    const onVisibilityChange = () => {
      if (!document.hidden && performance.now() >= deadline) finish(true);
    };
    motionPreference.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      finishRef.current = () => {};
      window.clearTimeout(setupTimer);
      window.clearTimeout(finishTimer);
      window.clearTimeout(hideTimer);
      if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame);
      motionPreference.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (phase === "hidden") return null;
  const leaving = phase === "leaving";

  return (
    <>
      <noscript><style>{"#boot-seq{display:none!important}"}</style></noscript>
      <div
        id="boot-seq"
        className={leaving ? "done" : ""}
        role="dialog"
        aria-modal={!leaving}
        aria-label={t.boot.label}
        aria-hidden={leaving}
        onKeyDown={(event) => {
          if (event.key === "Escape") finishRef.current();
          if (event.key === "Tab") {
            event.preventDefault();
            skipRef.current?.focus();
          }
        }}
      >
        <div className="w-full max-w-[640px] text-[13px] leading-[1.95]" aria-hidden="true">
          {t.boot.lines.map((line, index) => (
            <div key={index} className="boot-line" style={{ animationDelay: `${0.08 + index * 0.27}s` }}>
              <span className="text-[#7C6BFF]">{index === 0 ? "$ " : "› "}</span>
              <span>{line}</span>
              {index === t.boot.lines.length - 1 ? <span className="ml-2 text-[#7C6BFF]">_</span> : null}
            </div>
          ))}
        </div>
        <Button
          ref={skipRef}
          type="button"
          variant="ghost"
          onClick={() => finishRef.current()}
          tabIndex={leaving ? -1 : 0}
          disabled={leaving}
          className="fixed bottom-6 right-6 rounded border border-line bg-transparent px-3.5 py-2 font-mono text-[11px] tracking-[0.1em] text-copy-muted hover:border-[var(--accent)] hover:bg-accent-soft hover:text-[var(--foreground)]"
        >
          {t.boot.skip} <span aria-hidden="true">→</span>
        </Button>
      </div>
    </>
  );
}
