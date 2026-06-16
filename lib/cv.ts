import type { Lang } from "@/content/i18n";

const CV_SOURCE_URLS: Record<Lang, string> = {
  it: "https://raw.githubusercontent.com/marcodantonio/curriculum/main/dist/single-column/cv-it.pdf",
  en: "https://raw.githubusercontent.com/marcodantonio/curriculum/main/dist/single-column/cv-en.pdf",
};

const CV_DOWNLOAD_FILENAMES: Record<Lang, string> = {
  it: "Marco-DAntonio-CV-it.pdf",
  en: "Marco-DAntonio-CV-en.pdf",
};

export function isLang(value: string): value is Lang {
  return value === "it" || value === "en";
}

export function getCvSourceUrl(lang: Lang) {
  return CV_SOURCE_URLS[lang];
}

export function getCvDownloadPath(lang: Lang) {
  return `/cv/${lang}`;
}

export function getCvDownloadFilename(lang: Lang) {
  return CV_DOWNLOAD_FILENAMES[lang];
}
