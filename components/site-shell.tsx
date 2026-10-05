"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import BootSequence from "@/components/boot-sequence";
import PersonAIDock from "@/components/person-ai-dock";
import ThemeContextProvider from "@/context/theme-context";
import LanguageProvider from "@/context/language-context";
import type { Lang } from "@/content/i18n";
import WebMCPTools from "@/components/webmcp-tools";
import { useBootReady } from "@/lib/boot-state";

const ToastPortal = lazy(() => import("react-hot-toast").then((mod) => ({ default: mod.Toaster })));

type SiteShellProps = {
  initialLang: Lang;
  children: React.ReactNode;
};

export default function SiteShell({ initialLang, children }: SiteShellProps) {
  const [enhancementsReady, setEnhancementsReady] = useState(false);
  const bootReady = useBootReady();

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const usesIdleCallback = typeof win.requestIdleCallback === "function";
    const idle = win.requestIdleCallback
      ? win.requestIdleCallback(() => setEnhancementsReady(true))
      : win.setTimeout(() => setEnhancementsReady(true), 1200);

    return () => {
      if (usesIdleCallback) {
        win.cancelIdleCallback?.(idle);
      } else {
        win.clearTimeout(idle);
      }
    };
  }, []);

  return (
    <ThemeContextProvider>
      <LanguageProvider initialLang={initialLang}>
        <BootSequence />
        <div id="portfolio-content" inert={!bootReady}>
          <PersonAIDock className="island-ai-dock" />
          {enhancementsReady ? <WebMCPTools /> : null}
          {children}
          {enhancementsReady ? (
            <Suspense fallback={null}><ToastPortal
            position="bottom-center"
            gutter={12}
            toastOptions={{
              duration: 4500,
              style: {
                background: "var(--panel)",
                color: "var(--foreground)",
                border: "1px solid var(--line-subtle)",
                borderRadius: "16px",
                boxShadow: "var(--panel-shadow)",
                backdropFilter: "blur(14px)",
                padding: "12px 16px",
                fontFamily: "var(--font-sans)",
              },
              success: {
                iconTheme: {
                  primary: "var(--accent)",
                  secondary: "white",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "white",
                },
              },
            }}
            /></Suspense>
          ) : null}
        </div>
      </LanguageProvider>
    </ThemeContextProvider>
  );
}
