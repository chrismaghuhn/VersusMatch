import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { captureServerError } from "@/lib/observability";

export function isMagicLinkEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

type SendMagicLinkResult = { ok: true } | { ok: false; error: string };

async function sendViaResend(
  email: string,
  redirectTo: string
): Promise<SendMagicLinkResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { ok: false, error: "Email service not configured" };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const actionLink = data.properties?.action_link;
  if (!actionLink) {
    return { ok: false, error: "Failed to generate login link" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your MemeFight login link",
      html: [
        `<p>Click below to log in to MemeFight. This link expires soon.</p>`,
        `<p><a href="${escapeHtml(actionLink)}" style="font-weight:bold">Log in to MemeFight</a></p>`,
        `<p style="color:#666;font-size:13px">Open the link in the same browser where you requested it. If you did not request this, you can ignore this email.</p>`,
      ].join(""),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    captureServerError("magic-link-resend", new Error(`Resend failed: ${response.status}`), {
      body: body.slice(0, 200),
    });
    return { ok: false, error: "Failed to send login email. Please try again shortly." };
  }

  return { ok: true };
}

async function sendViaSupabaseOtp(
  email: string,
  redirectTo: string
): Promise<SendMagicLinkResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function sendMagicLinkEmail(
  email: string,
  redirectTo: string
): Promise<SendMagicLinkResult> {
  if (isMagicLinkEmailConfigured()) {
    return sendViaResend(email, redirectTo);
  }

  return sendViaSupabaseOtp(email, redirectTo);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
