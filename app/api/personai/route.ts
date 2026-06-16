import { NextResponse } from "next/server";

import { answerPersonAIQuestion } from "@/lib/personai";
import { consumeRateLimit, getClientFingerprint, getRequestOrigin, isTrustedOrigin } from "@/lib/security";
import { verifyTurnstile } from "@/lib/turnstile";
import { validateString } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const headers = request.headers;
    if (!isTrustedOrigin(getRequestOrigin(headers), headers.get("host"))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const limiter = consumeRateLimit(getClientFingerprint(headers), {
      limit: 8,
      windowMs: 5 * 60 * 1000,
    });
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const body = (await request.json()) as {
      question?: unknown;
      lang?: unknown;
      turnstileToken?: unknown;
    };

    const tokenValid = await verifyTurnstile(body.turnstileToken);
    if (!tokenValid) {
      return NextResponse.json(
        { error: "Security check failed. Please try again." },
        { status: 403 }
      );
    }

    if (!validateString(body.question, 500)) {
      return NextResponse.json(
        { error: "Please provide a valid question." },
        { status: 400 }
      );
    }

    const lang = body.lang === "en" ? "en" : "it";
    const result = await answerPersonAIQuestion(body.question, lang);

    return NextResponse.json(result);
  } catch (error) {
    console.error("personai: request failed", error);
    return NextResponse.json(
      { error: "personAI could not process the request." },
      { status: 500 }
    );
  }
}
