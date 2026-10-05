import type { APIRoute } from "astro";
import { answerPersonAIQuestion } from "@/lib/personai";
import { consumeRateLimit, getClientFingerprint, getRequestOrigin, isTrustedOrigin } from "@/lib/security";
import { verifyTurnstile } from "@/lib/turnstile";
import { validateString } from "@/lib/utils";

export const POST: APIRoute = async ({ request }) => {
  try {
    const headers = request.headers;
    if (!isTrustedOrigin(getRequestOrigin(headers), headers.get("host"))) {
      return Response.json({ error: "Forbidden." }, { status: 403 });
    }
    const limiter = consumeRateLimit(getClientFingerprint(headers), {
      limit: 8,
      windowMs: 5 * 60 * 1000,
    });
    if (!limiter.allowed) {
      return Response.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } },
      );
    }
    let body: { question?: unknown; lang?: unknown; turnstileToken?: unknown };
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return Response.json({ error: "Invalid request." }, { status: 400 });
      }
      body = parsed;
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    if (!validateString(body.question, 500)) {
      return Response.json({ error: "Please provide a valid question." }, { status: 400 });
    }
    if (!(await verifyTurnstile(body.turnstileToken))) {
      return Response.json({ error: "Security check failed. Please try again." }, { status: 403 });
    }
    const result = await answerPersonAIQuestion(body.question, body.lang === "en" ? "en" : "it");
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("personai: request failed", error);
    return Response.json({ error: "personAI could not process the request." }, { status: 500 });
  }
};
