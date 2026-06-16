import { getCloudflareContext } from "@opennextjs/cloudflare";

export type WorkersAIResult = unknown;

export async function getCloudflareRuntimeEnv() {
  try {
    // Works in production on CF Workers and in Next.js dev with
    // initOpenNextCloudflareForDev + experimental.remoteBindings.
    const { env } = await getCloudflareContext({ async: true });
    const e = env as unknown as Record<string, unknown>;
    return {
      AI: e.AI as { run: (...args: unknown[]) => Promise<unknown> } | undefined,
    };
  } catch {
    // Outside CF/OpenNext context (plain next dev without remoteBindings).
    return { AI: undefined };
  }
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
