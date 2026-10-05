"use client";

import { useSyncExternalStore } from "react";

let completed = false;
const listeners = new Set<() => void>();

/** A latched handoff: late-loading consumers cannot miss the bootend event. */
export function isBootComplete() {
  return completed || (typeof document !== "undefined" && document.documentElement.dataset.bootState === "ready");
}

export function subscribeBoot(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function completeBoot() {
  if (isBootComplete()) return;
  completed = true;
  document.documentElement.dataset.bootState = "ready";
  try {
    window.sessionStorage.setItem("booted", "1");
  } catch {
    // A blocked storage area must not block the portfolio or its next visit.
  }
  listeners.forEach((listener) => listener());
  document.dispatchEvent(new Event("bootend"));
}

// Keep server-rendered content readable without JavaScript. The overlay owns
// the initial visual state; client consumers wait only while boot is active.
const getServerSnapshot = () => true;

export function useBootReady() {
  return useSyncExternalStore(subscribeBoot, isBootComplete, getServerSnapshot);
}
