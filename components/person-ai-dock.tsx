"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";

const HeroMiniChat = lazy(() => import("@/components/hero-mini-chat"));

type PersonAIDockProps = {
  className?: string;
};

/**
 * A compact, persistent entry point for Marco.AI.
 *
 * The assistant itself remains untouched: it still owns its language context,
 * Turnstile lifecycle, request contract, and conversation state. It only mounts
 * after the first open, then stays mounted while the panel is visually closed
 * so a visitor never loses an in-progress conversation.
 */
export default function PersonAIDock({ className }: PersonAIDockProps) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const copy = t.journey.ai;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("personai:state", { detail: { open } }));
  }, [open]);

  const openDock = () => {
    setHasOpened(true);
    setOpen(true);
  };

  const closeDock = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    // The existing chat still emits the hero-scoped pulse. Relay it here so a
    // site-wide JourneyCanvas can subscribe to the neutral event immediately;
    // HeroMiniChat can switch to `journey:pulse` directly in a later cleanup.
    const relayPulse = () => window.dispatchEvent(new CustomEvent("journey:pulse"));
    window.addEventListener("hero:pulse", relayPulse);
    return () => window.removeEventListener("hero:pulse", relayPulse);
  }, []);

  useEffect(() => {
    // Lets the hero retain a compact Marco.AI entry without mounting a second
    // copy of the conversation. The dock remains the single persistent host.
    const onOpenRequest = () => {
      setHasOpened(true);
      setOpen(true);
    };
    window.addEventListener("personai:open", onOpenRequest);
    return () => window.removeEventListener("personai:open", onOpenRequest);
  }, []);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    // A non-modal dialog should still receive focus on open. If the lazy chat
    // module arrives during this frame, move focus to its labelled input.
    panel.focus();
    const focusInput = () => {
      const input = panel.querySelector<HTMLInputElement>("#hero-chat-input");
      if (!input) return false;
      input.focus();
      return true;
    };
    if (focusInput()) return;

    const observer = new MutationObserver(() => {
      if (focusInput()) observer.disconnect();
    });
    observer.observe(panel, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [open]);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[220] flex items-end sm:bottom-6 sm:right-6",
        className
      )}
    >
      {hasOpened ? (
        <motion.aside
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal={false}
          aria-label={copy.label}
          aria-hidden={!open}
          inert={!open}
          tabIndex={-1}
          initial={reducedMotion ? false : "closed"}
          animate={open ? "open" : "closed"}
          variants={{
            open: { opacity: 1, y: 0, scale: 1 },
            closed: { opacity: 0, y: 14, scale: 0.98 },
          }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 380, damping: 31, mass: 0.72 }
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeDock();
            }
          }}
          className="absolute bottom-[calc(100%+0.75rem)] right-0 w-[min(460px,calc(100vw-2rem))] origin-bottom-right pointer-events-auto"
          style={{ pointerEvents: open ? "auto" : "none" }}
        >
          <div className="relative">
            <div className="pointer-events-none absolute -top-8 left-0 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-copy-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
              {copy.status}
            </div>
            <button
              type="button"
              onClick={closeDock}
              className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-line-subtle bg-[var(--background)] text-copy-muted shadow-panel transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              aria-label={copy.close}
            >
              <X aria-hidden="true" size={15} strokeWidth={2} />
            </button>
            <Suspense fallback={<div className="ds-panel p-6" role="status">{t.game.loading}</div>}><HeroMiniChat /></Suspense>
          </div>
        </motion.aside>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={hasOpened ? panelId : undefined}
        aria-label={open ? copy.close : copy.open}
        onClick={() => (open ? closeDock() : openDock())}
        className="ds-btn ds-btn--default h-11 rounded-full px-4 shadow-[0_14px_42px_color-mix(in_srgb,var(--accent)_32%,transparent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <MessageCircle aria-hidden="true" size={16} strokeWidth={1.8} />
        <span className="ml-2 font-mono text-[11px] font-semibold tracking-[0.08em]">Marco.AI</span>
      </button>
    </div>
  );
}
