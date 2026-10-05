"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { dictionary, type Lang } from "@/content/i18n";

type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (typeof dictionary)[Lang];
};

const LanguageContext = createContext<LanguageContextType | null>(null);

type LanguageProviderProps = {
  children: React.ReactNode;
  initialLang: Lang;
};

export default function LanguageProvider({ children, initialLang }: LanguageProviderProps) {
  // Route-driven default: the server decides the active locale, and the
  // client keeps it in sync with the URL after mount.
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    const initial = document.documentElement.lang === "en" ? "en" : initialLang;
    // Keep the context aligned with the SSR locale and persist it for future
    // visits. The document lang is already set server-side by the layout.
    setLangState(initial);
    try { window.localStorage.setItem("lang", initial); } catch { /* Storage is optional. */ }
  }, [initialLang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    try { window.localStorage.setItem("lang", next); } catch { /* Storage is optional. */ }

    const target = new URL(window.location.href);
    target.pathname = next === "it" ? "/" : "/en";
    if (next === "it") target.searchParams.set("lang", "it");
    else target.searchParams.delete("lang");
    // Both URLs are independently server-rendered by Astro. Keep this running
    // game and its chat intact when only the visible language changes.
    window.history.replaceState(null, "", `${target.pathname}${target.search}${target.hash}`);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: dictionary[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (ctx === null) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
