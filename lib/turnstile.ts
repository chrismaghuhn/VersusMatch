import { parseJsonResponse } from "@/lib/parse-json-response";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return true;
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  });

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      console.error("[turnstile] verify request failed", response.status);
      return false;
    }

    const result = await parseJsonResponse<{ success?: boolean }>(response);
    return result?.success === true;
  } catch {
    console.error("[turnstile] verify request error");
    return false;
  }
}

export function isTurnstileRequired(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}
