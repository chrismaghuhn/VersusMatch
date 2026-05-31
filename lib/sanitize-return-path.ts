/** Internal path only — rejects protocol-relative and external URLs. */
export function sanitizeReturnPath(path: string | null | undefined, fallback = "/create"): string {
  const candidate = (path ?? fallback).trim();
  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate;
  }
  return fallback;
}
