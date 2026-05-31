"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseJsonResponse } from "@/lib/parse-json-response";
import { sanitizeReturnPath } from "@/lib/sanitize-return-path";

const COOLDOWN_SECONDS = 60;

const errorMessages: Record<string, string> = {
  auth_callback_failed: "Login failed. Please request a new magic link.",
  missing_email: "Please enter your email address.",
};

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("only request this after")) {
    const secondsMatch = message.match(/after (\d+) seconds?/i);
    const wait = secondsMatch?.[1] ?? String(COOLDOWN_SECONDS);
    return `Too many requests. Wait ${wait} seconds and check your inbox — your last link is probably still valid.`;
  }

  if (lower.includes("error sending magic link") || lower.includes("failed to send login email")) {
    return "We couldn't send the login email right now. Try again in a minute, or contact support if it keeps failing.";
  }

  return message;
}

function parseCooldownSeconds(message: string): number {
  const secondsMatch = message.match(/after (\d+) seconds?/i);
  return secondsMatch ? Number(secondsMatch[1]) : COOLDOWN_SECONDS;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnPath(searchParams.get("returnTo"));
  const isBattleReturn = returnTo.startsWith("/b/");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(searchParams.get("sent") === "1");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(() => {
    const param = searchParams.get("error");
    if (!param) return null;
    const decoded = errorMessages[param] ?? decodeURIComponent(param);
    return formatAuthError(decoded);
  });

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cooldown > 0) return;

    setIsLoading(true);
    setError(null);
    setSent(false);

    const response = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), next: returnTo }),
    });

    const data = await parseJsonResponse<{ error?: string }>(response);

    setIsLoading(false);

    if (!response.ok || data?.error) {
      const message = data?.error ?? "Login failed";
      const friendly = formatAuthError(message);
      setError(friendly);

      if (message.toLowerCase().includes("rate limit")) {
        setCooldown(parseCooldownSeconds(message));
      }

      return;
    }

    setSent(true);
    setCooldown(COOLDOWN_SECONDS);
  }

  const submitDisabled = isLoading || cooldown > 0;

  return (
    <Card className="w-full border-white/10 bg-[#0a0a0a]">
      <CardHeader>
        <CardTitle className="text-white">Login</CardTitle>
        <CardDescription>
          {isBattleReturn
            ? "Magic link via email — log in to claim XP and streak rewards for your vote. Open the link in the same browser where you requested it."
            : "Magic link via email — only needed to create battles. Open the link in the same browser where you requested it."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent && (
          <p className="border border-[#CCFF00]/30 bg-[#CCFF00]/5 px-4 py-3 text-sm text-white">
            Check your inbox — the login link is on its way. Open it in the same browser.
            You can request a new link {cooldown > 0 ? `in ${cooldown}s` : "later"}.
          </p>
        )}
        {error && (
          <p className="border border-[#FF2D87]/40 bg-[#FF2D87]/10 px-4 py-3 text-sm text-[#FF2D87]">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            name="email"
            type="email"
            placeholder="you@email.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" className="w-full" disabled={submitDisabled}>
            {isLoading
              ? "Sending…"
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Send magic link"}
          </Button>
        </form>
        <p className="text-center text-sm text-white/50">
          <Link href="/" className="underline underline-offset-4 hover:text-[#CCFF00]">
            Back to home
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
