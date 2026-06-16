"use client";

import type { ReactNode } from "react";
import Footer from "@/components/footer";
import GrainOverlay from "@/components/grain-overlay";
import Header from "@/components/header";
import ScrollProgress from "@/components/scroll-progress";
import ThemeContextProvider from "@/context/theme-context";
import LanguageProvider from "@/context/language-context";
import type { Lang } from "@/content/i18n";

type DocsShellProps = {
  children: ReactNode;
  initialLang: Lang;
};

export default function DocsShell({ children, initialLang }: DocsShellProps) {
  return (
    <ThemeContextProvider>
      <LanguageProvider initialLang={initialLang}>
        <GrainOverlay />
        <ScrollProgress />
        <Header mode="docs" />
        {children}
        <Footer />
      </LanguageProvider>
    </ThemeContextProvider>
  );
}
