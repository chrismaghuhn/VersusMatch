import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-12">
      <Suspense fallback={<div className="w-full text-center text-sm text-white/50">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
