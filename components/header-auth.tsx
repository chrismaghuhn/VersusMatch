"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type MeUser = { id: string; email: string | null };

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function HeaderNavAuth() {
  const [user, setUser] = useState<MeUser | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data: { user: MeUser | null }) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  if (!user) return null;

  return (
    <Link
      href="/my-battles"
      className="px-3 py-1.5 text-white/50 transition hover:bg-white/5 hover:text-white"
      style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em" }}
    >
      MY BATTLES
    </Link>
  );
}

export function HeaderAuth() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data: { user: MeUser | null }) => {
        setUser(data.user);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  if (!ready) {
    return <div className="h-9 w-16 animate-pulse rounded bg-white/10" aria-hidden />;
  }

  if (user) {
    return (
      <form action="/api/auth/logout" method="POST">
        <Button type="submit" variant="ghost" size="sm" className="gap-1">
          <LogOutIcon />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </form>
    );
  }

  return (
    <Link href="/auth/login">
      <Button variant="outline" size="sm">
        Login
      </Button>
    </Link>
  );
}
