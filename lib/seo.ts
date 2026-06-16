import type { Metadata } from "next";
import type { Lang } from "@/content/i18n";
import { socialLinks, siteProfile, skillGroups } from "@/content/site";

const SITE_URL = "https://marcodantonio.it";
const SITE_NAME = "Marco D'Antonio";
const PAGE_TITLE = "Marco D'Antonio — Software Developer & AI Engineer";

const localeConfig: Record<
  Lang,
  { path: string; locale: string; description: string; socialImagePath: string }
> = {
  it: {
    path: "/",
    locale: "it_IT",
    socialImagePath: "/portrait.jpg",
    description:
      "Portfolio di Marco D'Antonio, software developer specializzato in AI, computer vision e infrastruttura.",
  },
  en: {
    path: "/en",
    locale: "en_US",
    socialImagePath: "/portrait.jpg",
    description:
      "Portfolio of Marco D'Antonio, a software developer focused on AI, computer vision, and infrastructure.",
  },
};

function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

function getKeywords() {
  const skills = skillGroups.flatMap((group) => group.items);
  return Array.from(
    new Set([
      "Software Developer",
      "AI Engineer",
      "Computer Vision",
      "Infrastructure",
      "Netsons",
      "Python",
      ...skills.slice(0, 18),
    ])
  );
}

export function getLocaleMetadata(lang: Lang): Metadata {
  const cfg = localeConfig[lang];
  const url = absoluteUrl(cfg.path);

  return {
    metadataBase: new URL(SITE_URL),
    title: PAGE_TITLE,
    description: cfg.description,
    keywords: getKeywords(),
    alternates: {
      canonical: url,
      languages: {
        "it-IT": absoluteUrl("/"),
        "en-US": absoluteUrl("/en"),
        "x-default": absoluteUrl("/"),
      },
    },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: PAGE_TITLE,
      description: cfg.description,
      locale: cfg.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: PAGE_TITLE,
      description: cfg.description,
    },
  };
}

export function getPersonJsonLd(lang: Lang) {
  const cfg = localeConfig[lang];
  const pageUrl = absoluteUrl(cfg.path);
  const about = skillGroups.flatMap((group) => group.items).slice(0, 24);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${pageUrl}#person`,
        name: siteProfile.name,
        jobTitle: "Software Developer & AI Engineer",
        url: pageUrl,
        image: absoluteUrl(cfg.socialImagePath),
        description: cfg.description,
        sameAs: socialLinks.map((link) => link.href),
        knowsAbout: about,
        email: siteProfile.email,
      },
      {
        "@type": "WebSite",
        "@id": `${absoluteUrl("/")}#website`,
        url: absoluteUrl("/"),
        name: SITE_NAME,
        description: cfg.description,
        inLanguage: ["it", "en"],
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: PAGE_TITLE,
        description: cfg.description,
        inLanguage: lang === "en" ? "en" : "it",
        isPartOf: { "@id": `${absoluteUrl("/")}#website` },
        about: { "@id": `${pageUrl}#person` },
        mainEntity: { "@id": `${pageUrl}#person` },
      },
    ],
  };
}

export { SITE_URL, PAGE_TITLE };
