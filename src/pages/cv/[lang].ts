import type { APIRoute } from "astro";
import { getCvDownloadFilename, getCvSourceUrl, isLang } from "@/lib/cv";

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang ?? "";
  if (!isLang(lang)) return new Response("Not found", { status: 404 });
  try {
    const upstream = await fetch(getCvSourceUrl(lang));
    if (!upstream.ok || !upstream.body) return new Response("Unable to fetch the CV PDF.", { status: 502 });
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${getCvDownloadFilename(lang)}"`,
        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Unable to fetch the CV PDF.", { status: 502 });
  }
};
