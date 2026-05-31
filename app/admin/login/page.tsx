import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAdmin } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";
import { isAdminSessionValid } from "@/lib/admin-session";

type PageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/admin") ? params.next : "/admin/reports";

  if (!process.env.ADMIN_SECRET) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <p className="mt-4 text-muted-foreground">
          Setze <code className="text-sm">ADMIN_SECRET</code> in den Env-Vars, um die Moderation zu aktivieren.
        </p>
      </div>
    );
  }

  if (await isAdminSessionValid()) {
    redirect(nextPath);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Admin Login</h1>
      <p className="mt-2 text-muted-foreground">Moderation für MemeFight Battle-Reports.</p>

      <form action={loginAdmin} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <input
          type="password"
          name="key"
          placeholder="Admin secret"
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
          autoComplete="off"
          required
        />
        <Button type="submit" className="w-full">
          Anmelden
        </Button>
      </form>

      {params.error === "unauthorized" && (
        <p className="mt-4 text-sm text-destructive">Ungültiger Admin-Key.</p>
      )}

      <Link href="/" className="mt-6 inline-block text-sm text-muted-foreground hover:underline">
        Zur Startseite
      </Link>
    </div>
  );
}
