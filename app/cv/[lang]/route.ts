import { getCvDownloadFilename, getCvSourceUrl, isLang } from "@/lib/cv";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string }> }
) {
  const { lang } = await params;

  if (!isLang(lang)) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(getCvSourceUrl(lang), {
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Unable to fetch the CV PDF.", { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${getCvDownloadFilename(lang)}"`,
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
