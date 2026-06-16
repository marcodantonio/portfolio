"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  // Route-driven default: the server decides the active locale, and the
  // client keeps it in sync with the URL after mount.
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    const initial = document.documentElement.lang === "en" ? "en" : initialLang;
    // Keep the context aligned with the SSR locale and persist it for future
    // visits. The document lang is already set server-side by the layout.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLangState(initial);
    window.localStorage.setItem("lang", initial);
  }, [initialLang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    window.localStorage.setItem("lang", next);

    const suffix = `${window.location.search}${window.location.hash}`;
    const target = next === "it" ? `/${suffix}` : `/en${suffix}`;
    router.replace(target, { scroll: false });
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
