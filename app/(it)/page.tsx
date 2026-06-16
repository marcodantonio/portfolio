import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SiteContent from "@/components/site-content";
import SeoJsonLd from "@/components/seo-jsonld";
import type { Lang } from "@/content/i18n";
import { getPreferredLangFromHeaders } from "@/lib/locale";
import { getLocaleMetadata } from "@/lib/seo";

export const metadata = getLocaleMetadata("it");

export default async function ItalianPage() {
  const langFromLocation = getPreferredLangFromHeaders(await headers());
  if (langFromLocation === "en") {
    redirect("/en");
  }

  const lang: Lang = "it";

  return (
    <>
      <SeoJsonLd lang={lang} />
      <SiteContent />
    </>
  );
}
