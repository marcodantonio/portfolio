import type { Lang } from "@/content/i18n";

type HeadersLike = Pick<Headers, "get">;

export function getPreferredLangFromHeaders(headers: HeadersLike): Lang {
  const country = headers.get("cf-ipcountry")?.trim().toUpperCase();
  if (!country) return "it";
  return country === "IT" ? "it" : "en";
}
