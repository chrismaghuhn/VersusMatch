import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_SESSION_COOKIE = "mf_admin_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function signPayload(payload: string): string {
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SECRET is not configured");
  }

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function createAdminSessionToken(): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = expiresAt.toString();
  return `${payload}.${signPayload(payload)}`;
}

export function validateAdminSessionToken(token: string | undefined): boolean {
  if (!token || !process.env.ADMIN_SECRET) {
    return false;
  }

  const [expiresAtRaw, signature] = token.split(".");

  if (!expiresAtRaw || !signature) {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);

  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return false;
  }

  return safeEqual(signature, signPayload(expiresAtRaw));
}

export async function getAdminSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function isAdminSessionValid(): Promise<boolean> {
  return validateAdminSessionToken(await getAdminSessionToken());
}

export async function setAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/admin",
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function requireAdminSession(loginNext = "/admin/reports"): Promise<void> {
  if (!process.env.ADMIN_SECRET) {
    return;
  }

  if (!(await isAdminSessionValid())) {
    redirect(`/admin/login?next=${encodeURIComponent(loginNext)}`);
  }
}
