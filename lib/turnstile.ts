/**
 * Validates a Cloudflare Turnstile token server-side.
 * Returns true if valid, false otherwise.
 * Server-only: only imported from API routes and server actions.
 */
export async function verifyTurnstile(token: unknown): Promise<boolean> {
  if (typeof token !== "string" || !token.trim()) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    );
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
