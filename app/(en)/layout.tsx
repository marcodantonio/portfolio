import type { ReactNode } from "react";
import SiteShell from "@/components/site-shell";

export default function EnglishLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SiteShell initialLang="en">{children}</SiteShell>;
}
