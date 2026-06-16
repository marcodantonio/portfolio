import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { homepageLinkHeader } from "./lib/agent-discovery";

const isDev = process.env.NODE_ENV === "development";

const remoteBindingsDevOptions = {
  experimental: {
    remoteBindings: true,
  },
} as Parameters<typeof initOpenNextCloudflareForDev>[0];

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://static.cloudflareinsights.com`,
      "connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com",
      "frame-src https://challenges.cloudflare.com",
      "media-src 'self'",
      "worker-src 'self' blob:",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
];

if (isDev) {
  void initOpenNextCloudflareForDev(remoteBindingsDevOptions);
}

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 95],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/",
        headers: [{ key: "Link", value: homepageLinkHeader }],
      },
      {
        source: "/en",
        headers: [{ key: "Link", value: homepageLinkHeader }],
      },
      {
        source: "/docs/api",
        headers: [
          { key: "Link", value: '</.well-known/api-catalog>; rel="api-catalog"; type="application/json"' },
        ],
      },
      {
        source: "/.well-known/api-catalog",
        headers: [{ key: "Link", value: '</docs/api>; rel="service-doc"; type="text/html"' }],
      },
    ];
  },
};

export default nextConfig;
