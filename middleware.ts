import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/create",
    "/my-battles",
    "/admin/:path*",
    "/auth/:path*",
    "/party/:path*",
    "/board-brawl/:path*",
    "/onboarding",
    "/api/profile",
    "/api/party/:path*",
    "/api/board-brawl/:path*",
  ],
};
