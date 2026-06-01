import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function sanitizeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/create";
  }
  return next;
}

function loginErrorRedirect(origin: string, message: string, returnTo?: string) {
  const params = new URLSearchParams({ error: message });
  if (returnTo) {
    params.set("returnTo", returnTo);
  }
  return NextResponse.redirect(`${origin}/auth/login?${params.toString()}`);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  const next = sanitizeNextPath(searchParams.get("next"));
  const authError = searchParams.get("error_description") ?? searchParams.get("error");

  if (authError) {
    return loginErrorRedirect(origin, authError, next);
  }

  const redirectUrl = `${origin}${next}`;
  const supabaseResponse = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType,
    });

    if (error) {
      return loginErrorRedirect(origin, error.message, next);
    }

    return supabaseResponse;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return loginErrorRedirect(origin, error.message, next);
    }

    return supabaseResponse;
  }

  return loginErrorRedirect(
    origin,
    "Login link expired or already used. Request a fresh magic link and open the newest email only.",
    next
  );
}
