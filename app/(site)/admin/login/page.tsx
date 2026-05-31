import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAdmin } from "@/app/(site)/admin/login/actions";
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
        <h1 className="text-2xl font-black text-white">Admin Login</h1>
        <p className="mt-4 text-white/50">
          Set <code className="text-sm text-[#CCFF00]">ADMIN_SECRET</code> in your env vars to
          enable moderation.
        </p>
      </div>
    );
  }

  if (await isAdminSessionValid()) {
    redirect(nextPath);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-black text-white">Admin Login</h1>
      <p className="mt-2 text-white/50">Moderation for MemeFight battle reports.</p>

      <form action={loginAdmin} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <input
          type="password"
          name="key"
          placeholder="Admin secret"
          className="w-full border border-white/15 bg-black px-3 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]"
          autoComplete="off"
          required
        />
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      {params.error === "unauthorized" && (
        <p className="mt-4 text-sm text-[#FF2D87]">Invalid admin key.</p>
      )}

      <Link href="/" className="mt-6 inline-block text-sm text-white/50 hover:text-[#CCFF00]">
        Back to home
      </Link>
    </div>
  );
}
