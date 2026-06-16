"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const CustomCursor = dynamic(() => import("@/components/custom-cursor"), {
  ssr: false,
});

/**
 * Idle-deferred, fine-pointer-gated loader for the custom cursor.
 * Coarse pointers (touch) never load it; fine pointers wait for the main
 * thread to go idle so the cursor never competes with first paint.
 */
export default function DeferredCustomCursor() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (win.requestIdleCallback) {
      const handle = win.requestIdleCallback(() => setReady(true));
      return () => win.cancelIdleCallback?.(handle);
    }

    const handle = win.setTimeout(() => setReady(true), 900);
    return () => win.clearTimeout(handle);
  }, []);

  return ready ? <CustomCursor /> : null;
}
