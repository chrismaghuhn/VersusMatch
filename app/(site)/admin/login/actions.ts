"use server";

import { redirect } from "next/navigation";
import { isAdminKeyValid } from "@/lib/admin-auth";
import { clearAdminSessionCookie, setAdminSessionCookie } from "@/lib/admin-session";

function safeNextPath(value: string | null): string {
  if (value && value.startsWith("/admin")) {
    return value;
  }

  return "/admin/reports";
}

export async function loginAdmin(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  const nextPath = safeNextPath(String(formData.get("next") ?? ""));

  if (!isAdminKeyValid(key)) {
    redirect(`/admin/login?error=unauthorized&next=${encodeURIComponent(nextPath)}`);
  }

  await setAdminSessionCookie();
  redirect(nextPath);
}

export async function logoutAdmin() {
  await clearAdminSessionCookie();
  redirect("/admin/login");
}
