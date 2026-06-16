type HeadersLike = Pick<Headers, "get">;

const isProductionBuild = process.env.NODE_ENV === "production";

const allowedOrigins = new Set([
  "https://marcodantonio.it",
  "https://www.marcodantonio.it",
]);

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

type RateLimitState = {
  count: number;
  resetAt: number;
};

const globalState = globalThis as typeof globalThis & {
  __portfolioRateLimitStore?: Map<string, RateLimitState>;
};

// NOTE: in-memory state is per-isolate on Cloudflare Workers, so the effective
// global limit is (limit × isolates). Accepted: Turnstile is the primary abuse
// gate; this limiter only blunts per-isolate bursts.
const rateLimitStore = globalState.__portfolioRateLimitStore ?? new Map<string, RateLimitState>();
globalState.__portfolioRateLimitStore = rateLimitStore;

export function getRequestOrigin(headersLike: HeadersLike): string | null {
  const origin = headersLike.get("origin")?.trim();
  if (origin) return origin;

  const referer = headersLike.get("referer")?.trim();
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function isTrustedOrigin(origin: string | null, requestHost?: string | null): boolean {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    if (allowedOrigins.has(url.origin)) return true;
    if (url.protocol === "http:" && isLoopbackHost(url.hostname)) {
      // Loopback origins are legitimate only when the server itself runs on
      // loopback: `next dev` (non-production build) or `wrangler preview`
      // (production build, but the request's Host header is loopback). A real
      // production deployment is never addressed via a loopback host.
      //
      // Threat model: this check defends against browser CSRF only. Browsers
      // cannot forge Host, so the loopback gate is not attacker-controllable
      // there; non-browser clients can forge Origin itself, and were never
      // stopped by this check — Turnstile is the gate for them.
      if (!isProductionBuild) return true;
      return requestHost ? isLoopbackHost(requestHost.split(":")[0]) : false;
    }
    return false;
  } catch {
    return false;
  }
}

export function getClientFingerprint(headersLike: HeadersLike): string {
  const ip =
    headersLike.get("cf-connecting-ip")?.trim() ||
    headersLike.get("x-real-ip")?.trim() ||
    headersLike.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (ip) return ip;

  const ua = headersLike.get("user-agent")?.trim() || "unknown-agent";
  const origin = getRequestOrigin(headersLike) || "unknown-origin";
  return `${origin}|${ua}`;
}

export function consumeRateLimit(
  key: string,
  options: { limit: number; windowMs: number }
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const state = rateLimitStore.get(key);

  if (!state || state.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(options.windowMs / 1000) };
  }

  if (state.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
    };
  }

  state.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
  };
}

