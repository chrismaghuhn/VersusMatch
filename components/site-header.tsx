import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LogOut, Swords } from "lucide-react";
import { logout } from "@/app/auth/actions";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Swords className="h-5 w-5" />
          </span>
          MemeFight
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/feed"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Feed
          </Link>
          {user && (
            <Link
              href="/my-battles"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Meine Battles
            </Link>
          )}
          <Link href="/create">
            <Button size="sm">Battle erstellen</Button>
          </Link>
          {user ? (
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm" className="gap-1">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          ) : (
            <Link href="/auth/login">
              <Button variant="outline" size="sm">
                Login
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
