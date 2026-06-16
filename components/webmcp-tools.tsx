"use client";

import { useEffect } from "react";
import { useLanguage } from "@/context/language-context";
import { siteProfile } from "@/content/site";

type ModelContextTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<string> | string;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
};

type ModelContextSurface = {
  registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => void;
};

function getModelContext(): ModelContextSurface | undefined {
  const doc = document as Document & {
    modelContext?: ModelContextSurface;
  };

  const nav = navigator as Navigator & {
    modelContext?: ModelContextSurface;
  };

  return doc.modelContext ?? nav.modelContext;
}

export default function WebMCPTools() {
  const { lang } = useLanguage();

  useEffect(() => {
    const modelContext = getModelContext();
    if (!modelContext?.registerTool) return;

    const controller = new AbortController();
    const currentLang = lang;

    const register = (tool: ModelContextTool) => {
      modelContext.registerTool(tool, { signal: controller.signal });
    };

    const scrollToSection = async ({ section }: { section?: string }) => {
      const target = section === "top" ? null : document.getElementById(section ?? "");
      if (!target) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return "Scrolled to the top of the page.";
      }

      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return `Scrolled to section: ${section}.`;
    };

    register({
      name: "scroll_to_section",
      description: "Scroll the portfolio to a named section.",
      inputSchema: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: ["top", "about", "education", "skills", "projects", "experience", "contact"],
          },
        },
        required: ["section"],
      },
      execute: scrollToSection,
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: false,
      },
    });

    register({
      name: "focus_contact_form",
      description: "Jump to the contact section and focus the email field.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        const section = document.getElementById("contact");
        section?.scrollIntoView({ behavior: "smooth", block: "start" });
        const input = document.querySelector<HTMLInputElement>('input[name="senderEmail"]');
        input?.focus();
        return "Focused the contact email field.";
      },
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: false,
      },
    });

    register({
      name: "download_cv",
      description: "Open the localized CV PDF for the current locale or a chosen locale.",
      inputSchema: {
        type: "object",
        properties: {
          lang: {
            type: "string",
            enum: ["it", "en"],
          },
        },
      },
      execute: async ({ lang: requestedLang }) => {
        const targetLang = requestedLang === "it" || requestedLang === "en" ? requestedLang : currentLang;
        window.open(`/cv/${targetLang}`, "_blank", "noopener,noreferrer");
        return `Opened the ${targetLang.toUpperCase()} CV download.`;
      },
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: false,
      },
    });

    register({
      name: "copy_email",
      description: "Copy Marco's public email address to the clipboard.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        await navigator.clipboard.writeText(siteProfile.email);
        return `Copied ${siteProfile.email}.`;
      },
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: false,
      },
    });

    return () => controller.abort();
  }, [lang]);

  return null;
}
