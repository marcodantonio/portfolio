import type { APIRoute } from "astro";
import { SITE_URL } from "@/lib/seo";

export const GET: APIRoute = () => new Response(
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url><url><loc>${SITE_URL}/en</loc><changefreq>monthly</changefreq><priority>0.9</priority></url></urlset>`,
  { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } },
);
