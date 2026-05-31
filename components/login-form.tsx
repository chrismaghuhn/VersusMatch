"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const COOLDOWN_SECONDS = 60;

const errorMessages: Record<string, string> = {
  auth_callback_failed: "Login fehlgeschlagen. Bitte fordere einen neuen Magic Link an.",
  missing_email: "Bitte gib deine E-Mail-Adresse ein.",
};

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("only request this after")) {
    const secondsMatch = message.match(/after (\d+) seconds?/i);
    const wait = secondsMatch?.[1] ?? String(COOLDOWN_SECONDS);
    return `Zu viele Anfragen. Warte ${wait} Sekunden und prüfe dein Postfach — der letzte Link ist vermutlich noch gültig.`;
  }

  return message;
}

function parseCooldownSeconds(message: string): number {
  const secondsMatch = message.match(/after (\d+) seconds?/i);
  return secondsMatch ? Number(secondsMatch[1]) : COOLDOWN_SECONDS;
}

export function LoginForm() {
  const searchParams = useSearchParams();
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

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/create")}`;

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setIsLoading(false);

    if (signInError) {
      const friendly = formatAuthError(signInError.message);
      setError(friendly);

      if (signInError.message.toLowerCase().includes("rate limit")) {
        setCooldown(parseCooldownSeconds(signInError.message));
      }

      return;
    }

    setSent(true);
    setCooldown(COOLDOWN_SECONDS);
  }

  const submitDisabled = isLoading || cooldown > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Magic Link per E-Mail — nur nötig zum Erstellen von Battles. Link im selben Browser
          öffnen, in dem du ihn angefordert hast.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent && (
          <p className="rounded-lg bg-secondary px-4 py-3 text-sm">
            Check dein Postfach — der Login-Link ist unterwegs. Öffne ihn im selben Browser.
            Du kannst {cooldown > 0 ? `in ${cooldown}s` : "später"} einen neuen Link anfordern.
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            name="email"
            type="email"
            placeholder="deine@email.de"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" className="w-full" disabled={submitDisabled}>
            {isLoading
              ? "Wird gesendet…"
              : cooldown > 0
                ? `Erneut senden in ${cooldown}s`
                : "Magic Link senden"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            Zurück zur Startseite
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
