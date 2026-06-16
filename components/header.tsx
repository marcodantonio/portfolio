"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BsMoon, BsSun } from "react-icons/bs";
import { useTheme } from "@/context/theme-context";
import { useLanguage } from "@/context/language-context";
import { subscribeScroll } from "@/lib/scroll-signal";

const SECTIONS = ["about", "education", "skills", "projects", "experience", "contact"] as const;

type HeaderProps = {
  mode?: "site" | "docs";
};

export default function Header({ mode = "site" }: HeaderProps) {
  const { theme, toggleTheme, mounted } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    return subscribeScroll(() => {
      const next = window.scrollY > 60;
      if (next !== scrolledRef.current) {
        scrolledRef.current = next;
        setScrolled(next);
      }
    });
  }, []);

  useEffect(() => {
    if (mode === "docs") return;
    const sections = SECTIONS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [mode]);

  const navItems = SECTIONS.map((id) => ({ id, label: t.nav[id] }));
  const homeHref = lang === "en" ? "/en" : "/";

  return (
    <header id="site-nav" className={scrolled ? "scrolled" : undefined}>
      <Link href={homeHref} className="nav-logo" aria-label="Marco D'Antonio — home">
        MD<span>.</span>
      </Link>

      {mode === "site" ? (
        <nav className="hidden items-center gap-[26px] md:flex">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`nav-link${active === item.id ? " active" : ""}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      ) : (
        <div className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-copy-muted md:block">
          API & Agent Resources
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLang("it")}
            className={`lang-btn${lang === "it" ? " active" : ""}`}
            aria-pressed={lang === "it"}
          >
            IT
          </button>
          <span className="lang-sep">|</span>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`lang-btn${lang === "en" ? " active" : ""}`}
            aria-pressed={lang === "en"}
          >
            EN
          </button>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="nav-icon-btn p-1"
          aria-label="Toggle theme"
        >
          {mounted && theme === "light" ? <BsMoon size={15} /> : <BsSun size={15} />}
        </button>
      </div>
    </header>
  );
}
