import SiteContent from "@/components/site-content";
import SeoJsonLd from "@/components/seo-jsonld";
import type { Lang } from "@/content/i18n";
import { getLocaleMetadata } from "@/lib/seo";

export const metadata = getLocaleMetadata("en");

export default function EnglishPage() {
  const lang: Lang = "en";

  return (
    <>
      <SeoJsonLd lang={lang} />
      <SiteContent />
    </>
  );
}
