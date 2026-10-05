"use client";

import { useReducedMotion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useLanguage } from "@/context/language-context";
import { useTheme } from "@/context/theme-context";
import { turnstileSiteKey } from "@/content/site";

type Msg = { role: "user" | "ai"; text: string };

export default function HeroMiniChat() {
  const { t, lang } = useLanguage();
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chipsVisible, setChipsVisible] = useState(true);
  const msgsRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [msgs, loading]);

  const getToken = async (): Promise<string> => {
    const widget = turnstileRef.current;
    if (!widget) {
      throw new Error(t.hero.chatErrorOffline);
    }

    widget.reset();
    widget.execute();

    try {
      return await widget.getResponsePromise(30_000, 250);
    } catch {
      throw new Error(t.hero.chatErrorTimeout);
    }
  };

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setChipsVisible(false);
    setMsgs((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    window.dispatchEvent(new CustomEvent("hero:pulse"));

    try {
      const turnstileToken = await getToken();

      const res = await fetch("/api/personai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, lang, turnstileToken }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };

      setMsgs((prev) => [
        ...prev,
        {
          role: "ai",
          text: data.answer || data.error || t.hero.chatErrorGeneric,
        },
      ]);
      window.dispatchEvent(new CustomEvent("hero:pulse"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.hero.chatErrorOffline;
      setMsgs((prev) => [...prev, { role: "ai", text: msg }]);
    } finally {
      setLoading(false);
      turnstileRef.current?.reset();
    }
  }

  return (
    <div data-chat-widget className="chat-win w-full max-w-[min(96vw,620px)] pointer-events-auto">
      {/* Header */}
      <div className="chat-hdr flex items-center gap-2.5 px-4 py-3">
        <span
          className="h-[7px] w-[7px] flex-shrink-0 rounded-full"
          style={{
            background: "#28C840",
            boxShadow: "0 0 6px #28C840",
            animation: reducedMotion ? "none" : "pulseDot 2.5s ease infinite",
          }}
        />
        <span className="chat-hdr-title font-mono text-[13px] font-medium">marco.ai</span>
        <span className="chat-hdr-sub ml-auto hidden font-mono text-[10.5px] sm:block">{t.hero.chatSub}</span>
      </div>

      {/* Messages */}
      <div
        ref={msgsRef}
        data-lenis-prevent
        role="log"
        aria-label={t.journey.ai.label}
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={loading}
        className="flex flex-col gap-2.5 overflow-y-auto px-4 py-3.5"
        style={{ height: "160px", scrollbarWidth: "thin" }}
      >
        <div className="chat-msg-ai max-w-[85%] self-start rounded-[10px] px-3 py-2 text-[13px] leading-relaxed [border-bottom-left-radius:3px]">
          {t.hero.chatGreeting}
        </div>
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-[10px] px-3 py-2 text-[13px] leading-relaxed ${
              m.role === "ai"
                ? "chat-msg-ai self-start [border-bottom-left-radius:3px]"
                : "chat-msg-user self-end [border-bottom-right-radius:3px]"
            }`}
            style={{ animation: reducedMotion ? "none" : "msgIn 0.22s ease" }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="chat-typing flex items-center gap-1.5 self-start rounded-[10px] px-4 py-3 [border-bottom-left-radius:3px]">
            {[0, 0.2, 0.4].map((delay, i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{ animation: reducedMotion ? "none" : `typDot 1.2s ease ${delay}s infinite` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Chips */}
      {chipsVisible && (
        <div className="flex flex-wrap gap-1.5 px-3.5 py-2" style={{ borderTop: "1px solid rgba(124,107,255,0.1)" }}>
          {t.hero.chips.map((q) => (
            <button
              type="button"
              key={q}
              onClick={() => send(q)}
              className="chat-chip rounded-full px-3 py-1.5 font-mono text-[10.5px]"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="chat-foot flex items-center gap-2.5 px-3.5 py-2.5">
        <input
          id="hero-chat-input"
          name="question"
          aria-label={t.hero.chatPlaceholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          disabled={loading}
          placeholder={t.hero.chatPlaceholder}
          className="chat-in flex-1 rounded-[7px] px-3 py-2 text-[13.5px] outline-none transition-colors disabled:opacity-50"
          style={{ fontFamily: "inherit" }}
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={loading}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[7px] hover:brightness-110 disabled:opacity-50"
          style={{ background: "var(--accent)" }}
          aria-label={t.hero.chatSend}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Invisible Turnstile — silent until execute() is called on each send */}
      <Turnstile
        ref={turnstileRef}
        siteKey={turnstileSiteKey}
        options={{
          theme: theme === "light" ? "light" : "dark",
          size: "invisible",
          execution: "execute",
          appearance: "execute",
        }}
        onError={() => {
          setLoading(false);
        }}
        onExpire={() => turnstileRef.current?.reset()}
      />
    </div>
  );
}
