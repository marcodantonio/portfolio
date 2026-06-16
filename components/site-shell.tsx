"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import BootSequence from "@/components/boot-sequence";
import Footer from "@/components/footer";
import GrainOverlay from "@/components/grain-overlay";
import Header from "@/components/header";
import RevealManager from "@/components/system/reveal-manager";
import ScrollProgress from "@/components/scroll-progress";
import ThemeContextProvider from "@/context/theme-context";
import LanguageProvider from "@/context/language-context";
import type { Lang } from "@/content/i18n";
import WebMCPTools from "@/components/webmcp-tools";

const SmoothScroll = dynamic(() => import("@/components/system/smooth-scroll"), {
  ssr: false,
});
const ToastPortal = dynamic(() => import("react-hot-toast").then((mod) => mod.Toaster), {
  ssr: false,
});

type SiteShellProps = {
  initialLang: Lang;
  children: React.ReactNode;
};

export default function SiteShell({ initialLang, children }: SiteShellProps) {
  const [enhancementsReady, setEnhancementsReady] = useState(false);

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idle = win.requestIdleCallback
      ? win.requestIdleCallback(() => setEnhancementsReady(true))
      : win.setTimeout(() => setEnhancementsReady(true), 1200);

    return () => {
      if (typeof idle === "number") {
        win.clearTimeout(idle);
      } else {
        win.cancelIdleCallback?.(idle);
      }
    };
  }, []);

  return (
      <ThemeContextProvider>
      <LanguageProvider initialLang={initialLang}>
        {enhancementsReady ? <SmoothScroll /> : null}
        <GrainOverlay />
        <BootSequence />
        <ScrollProgress />
        <Header />
        <RevealManager />
        {enhancementsReady ? <WebMCPTools /> : null}
        {children}
        <Footer />
        {enhancementsReady ? (
          <ToastPortal
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
          />
        ) : null}
      </LanguageProvider>
    </ThemeContextProvider>
  );
}
