import { NextResponse } from "next/server";
import { sendMagicLinkEmail } from "@/lib/auth/send-magic-link";

export async function POST(request: Request) {
  let body: { email?: string; next?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const nextPath = String(body.next ?? "/create");

  if (!email) {
    return NextResponse.json({ error: "missing_email" }, { status: 400 });
  }

  const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/create";
  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const result = await sendMagicLinkEmail(email, redirectTo);

  if (!result.ok) {
    const status = result.error.toLowerCase().includes("rate limit") ? 429 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ success: true });
}
