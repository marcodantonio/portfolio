import { defineMiddleware } from "astro:middleware";
import { homepageLinkHeader } from "@/lib/agent-discovery";

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  const response = await next();
  const headers = new Headers(response.headers);
  const devConnect = import.meta.env.DEV ? " ws: wss:" : "";
  // GLTFLoader's ImageBitmapLoader fetches embedded textures through blob URLs.
  // Permit that only on the loopback review surface; public/game CSP is unchanged.
  const assetLabConnect = url.pathname === "/asset-lab"
    && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ? " blob:" : "";
  headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
    `connect-src 'self'${devConnect}${assetLabConnect} https://challenges.cloudflare.com https://cloudflareinsights.com`,
    "frame-src https://challenges.cloudflare.com",
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
  ].join("; "));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()");
  if (url.protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  if (url.pathname === "/" || url.pathname === "/en") {
    headers.set("Link", homepageLinkHeader);
    // Locale is encoded in the URL; don't cache country-specific HTML together.
    headers.append("Vary", "cf-ipcountry");
  } else if (url.pathname === "/docs/api") {
    headers.set("Link", '</.well-known/api-catalog>; rel="api-catalog"; type="application/json"');
  }
  if (url.pathname.startsWith("/api/")) headers.set("Cache-Control", "no-store");

  // Preserve the existing country-based first landing behavior. Explicit locale
  // switches include ?lang=it so Italian remains reachable outside Italy.
  const country = request.cf?.country;
  if (url.pathname === "/" && typeof country === "string" && country !== "IT" && url.searchParams.get("lang") !== "it") {
    headers.set("Location", "/en");
    headers.set("Cache-Control", "private, no-store");
    return new Response(null, { status: 302, headers });
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
