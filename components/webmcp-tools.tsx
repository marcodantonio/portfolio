"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/context/language-context";
import { siteProfile } from "@/content/site";
import { ISLANDS } from "@/lib/island-map";

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
  registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => void | Promise<void>;
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
  const langRef = useRef(lang);
  const hasRegisteredRef = useRef(false);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    if (hasRegisteredRef.current) return;

    const modelContext = getModelContext();
    if (!modelContext?.registerTool) return;

    hasRegisteredRef.current = true;

    const register = (tool: ModelContextTool) => {
      void Promise.resolve(modelContext.registerTool(tool)).catch(
        (error: unknown) => {
          console.error(`Unable to register WebMCP tool: ${tool.name}`, error);
        },
      );
    };

    const sections = ["top", ...ISLANDS.filter((island) => island.id !== "welcome").map((island) => island.id)];
    const openSection = async ({ section }: { section?: string }) => {
      if (!section || !sections.includes(section)) return "Unknown portfolio section.";

      const destination = section === "top" ? "home" : section;
      window.dispatchEvent(new CustomEvent("island:open", { detail: destination }));
      return section === "top" ? "Opened the archipelago map." : `Opened island content: ${section}.`;
    };

    register({
      name: "scroll_to_section",
      description: "Open a portfolio island's content, or return to the archipelago map with top.",
      inputSchema: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: sections,
          },
        },
        required: ["section"],
      },
      execute: openSection,
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: false,
      },
    });

    register({
      name: "open_marco_ai",
      description: "Open Marco.AI, Marco's digital assistant.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        window.dispatchEvent(new Event("personai:open"));
        return "Opened Marco.AI.";
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
        const targetLang = requestedLang === "it" || requestedLang === "en" ? requestedLang : langRef.current;
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

    // This bridge is document-scoped. Aborting its registration during React
    // Strict Mode cleanup causes an unhandled host rejection; the page owns
    // the registration lifecycle and the ref prevents duplicate registration.
  }, []);

  return null;
}
