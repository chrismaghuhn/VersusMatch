const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

function getOrigin(value: string | null): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function originsMatch(requestOrigin: string, configuredOrigin: string): boolean {
  if (requestOrigin === configuredOrigin) {
    return true;
  }

  try {
    const requestHost = new URL(requestOrigin).hostname.replace(/^www\./, "");
    const configuredHost = new URL(configuredOrigin).hostname.replace(/^www\./, "");
    return requestHost === configuredHost;
  } catch {
    return false;
  }
}

export function isEmbedVoteRequest(request: Request): boolean {
  const referer = request.headers.get("referer");
  if (!referer || !APP_URL) {
    return false;
  }

  try {
    const refererUrl = new URL(referer);
    if (!refererUrl.pathname.startsWith("/embed/")) {
      return false;
    }

    return originsMatch(refererUrl.origin, APP_URL);
  } catch {
    return false;
  }
}

export function isVoteRequestAllowed(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return false;
  }

  const origin = getOrigin(request.headers.get("origin"));
  const refererOrigin = getOrigin(request.headers.get("referer"));
  const requestOrigin = origin ?? refererOrigin;

  if (!requestOrigin) {
    return process.env.NODE_ENV === "development";
  }

  if (!APP_URL) {
    return process.env.NODE_ENV === "development";
  }

  return originsMatch(requestOrigin, APP_URL);
}
