"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BootLine = {
  parts: Array<{ text: string; color?: string; isCaret?: boolean; isBar?: boolean }>;
  delay: number;
};

const LINES: BootLine[] = [
  { parts: [{ text: "$ ", color: "#7C6BFF" }, { text: "initializing marco.dev " }, { isCaret: true, text: "" }], delay: 50 },
  { parts: [{ text: "› ", color: "#7C6BFF" }, { text: "loading shaders" }, { isBar: true, text: "" }, { text: "done", color: "#28C840" }], delay: 850 },
  { parts: [{ text: "› ", color: "#7C6BFF" }, { text: "compiling AI/CV pipeline" }, { isBar: true, text: "" }, { text: "done", color: "#28C840" }], delay: 850 },
  { parts: [{ text: "› ", color: "#7C6BFF" }, { text: "SSH tunnel: " }, { text: "active", color: "#28C840" }], delay: 280 },
  { parts: [{ text: "› ", color: "#7C6BFF" }, { text: "marco.ai assistant: " }, { text: "online", color: "#28C840" }], delay: 280 },
  { parts: [{ text: "› ", color: "#7C6BFF" }, { text: "portfolio_v4.compile() " }, { text: "→ ", color: "#FEBC2E" }, { text: "success", color: "#28C840" }], delay: 380 },
  { parts: [{ text: "$ ", color: "#7C6BFF" }, { text: "launch --user=recruiter " }, { isCaret: true, text: "" }], delay: 420 },
];

function BootLinePart({ part }: { part: BootLine["parts"][number] }) {
  if (part.isBar) {
    return <span className="boot-bar-el" />;
  }
  if (part.isCaret) {
    return (
      <span
        className="inline-block w-2 h-3.5 align-middle ml-0.5"
        style={{ background: "#7C6BFF", animation: "blinkCaret 1s step-end infinite" }}
      />
    );
  }
  return <span style={part.color ? { color: part.color } : undefined}>{part.text}</span>;
}

export default function BootSequence() {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const [renderedLines, setRenderedLines] = useState<BootLine[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finishedRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimers();
    sessionStorage.setItem("booted", "1");
    setDone(true);
    const hideTimer = setTimeout(() => setVisible(false), 700);
    // Lets the hero kick off its particle-formation flourish once the boot
    // overlay starts clearing.
    const bootTimer = setTimeout(() => document.dispatchEvent(new Event("bootend")), 250);
    timersRef.current.push(hideTimer, bootTimer);
  }, [clearTimers]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("booted")) {
      // Reading sessionStorage must happen post-mount to avoid an SSR/client
      // hydration mismatch, so this state sync legitimately lives in the effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
      return;
    }
    setVisible(true);

    let acc = 0;
    LINES.forEach((line) => {
      acc += line.delay;
      const t = setTimeout(() => {
        setRenderedLines((prev) => [...prev, line]);
      }, acc);
      timersRef.current.push(t);
    });

    const finishTimer = setTimeout(finish, acc + 450);
    timersRef.current.push(finishTimer);

    return clearTimers;
  }, [clearTimers, finish]);

  if (!visible && done) return null;

  return (
    <div id="boot-seq" className={done ? "done" : ""}>
      <div className="w-full max-w-[640px] text-[13px] leading-[1.95]">
        {renderedLines.map((line, i) => (
          <div key={i} className="boot-line" style={{ animationDelay: `${i * 0.02}s` }}>
            {line.parts.map((part, j) => (
              <BootLinePart key={j} part={part} />
            ))}
          </div>
        ))}
      </div>
      <button
        onClick={finish}
        className="fixed bottom-6 right-6 font-mono text-[11px] text-white/50 tracking-[0.1em] border border-[rgba(124,107,255,0.3)] px-3.5 py-2 rounded cursor-pointer transition-all hover:text-white hover:border-[#7C6BFF] hover:bg-[rgba(124,107,255,0.15)] bg-transparent"
      >
        SKIP →
      </button>
    </div>
  );
}
