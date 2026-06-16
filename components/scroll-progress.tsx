"use client";

import { useEffect, useRef } from "react";
import { subscribeScroll } from "@/lib/scroll-signal";

export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    return subscribeScroll(() => {
      const total = document.body.scrollHeight - window.innerHeight;
      bar.style.width = total > 0 ? `${(window.scrollY / total) * 100}%` : "0%";
    });
  }, []);

  return <div ref={barRef} className="scroll-bar" />;
}
