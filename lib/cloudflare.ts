import { env } from "cloudflare:workers";

export type WorkersAIResult = unknown;

export async function getCloudflareRuntimeEnv() {
  const bindings = env as unknown as Record<string, unknown>;
  return {
    AI: bindings.AI as { run: (...args: unknown[]) => Promise<unknown> } | undefined,
  };
}

export function getTurnstileSecret(): string | undefined {
  const secret = (env as unknown as Record<string, unknown>).TURNSTILE_SECRET_KEY;
  return typeof secret === "string" && secret.trim() ? secret : undefined;
}

export function readWorkersAIResponse(result: WorkersAIResult) {
  if (typeof result === "string") return result;
  const r = result as Record<string, unknown>;
  if (r?.response && typeof r.response === "object") {
    return JSON.stringify(r.response);
  }
  if (Array.isArray(r?.output)) {
    return (r.output as Array<Record<string, unknown>>)
      .map((o) => o.content ?? "")
      .join("\n");
  }
  if (typeof r?.response === "string") return r.response;
  return String(result ?? "");
}
