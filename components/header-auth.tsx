"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function HeaderNavAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
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
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <div className="h-9 w-16 animate-pulse rounded bg-white/10" aria-hidden />
    );
  }

  if (user) {
    return (
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm" className="gap-1">
          <LogOut className="h-4 w-4" />
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
