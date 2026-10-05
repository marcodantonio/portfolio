import SiteShell from "@/components/site-shell";
import SiteContent from "@/components/site-content";
import type { Lang } from "@/content/i18n";

/** The only hydrated Astro island owns the shared game/chat/language state. */
export default function PortfolioApp({ initialLang = "it" }: { initialLang?: Lang }) {
  return <SiteShell initialLang={initialLang}><SiteContent /></SiteShell>;
}
