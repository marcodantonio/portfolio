"use client";

import React, { useEffect, useState, createContext, useContext } from "react";

type Theme = "light" | "dark";

type ThemeContextProviderProps = {
  children: React.ReactNode;
};

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export default function ThemeContextProvider({
  children,
}: ThemeContextProviderProps) {
  // Server and first client render must agree, so start from the static
  // daylight default (matching SiteLayout) and reconcile with the
  // stored preference only after mount.
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    try { window.localStorage.setItem("theme", newTheme); } catch { /* Optional preference. */ }
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  useEffect(() => {
    // Post-mount reconciliation with the stored preference; running this in an
    // effect is what keeps SSR and first client render identical.
    setMounted(true);
    let stored: string | null = null;
    try { stored = window.localStorage.getItem("theme"); } catch { /* Optional preference. */ }
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  useEffect(() => {
    // Keep the document class in sync with the active theme.
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        mounted,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error("useTheme must be used within a ThemeContextProvider");
  }

  return context;
}
