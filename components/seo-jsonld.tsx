import type { Lang } from "@/content/i18n";
import { getPersonJsonLd } from "@/lib/seo";

export default function SeoJsonLd({ lang }: { lang: Lang }) {
  return (
    <script
      type="application/ld+json"
      // The payload is static and server-rendered for crawlers.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(getPersonJsonLd(lang)) }}
    />
  );
}
