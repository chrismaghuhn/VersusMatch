const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

export function isVoteRequestAllowed(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin")?.replace(/\/$/, "");
  if (origin) {
    return origin === APP_URL;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return refererOrigin === APP_URL;
    } catch {
      return false;
    }
  }

  return false;
}
