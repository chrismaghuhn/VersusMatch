const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

/** Maps display name to spec handle: lowercase, non-alnum → underscore. */
export function normalizeHandle(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
}

export function validateHandle(handle: string): { ok: true } | { ok: false; error: string } {
  if (!HANDLE_RE.test(handle)) {
    return {
      ok: false,
      error: "Handle must be 3–20 characters: lowercase letters, numbers, underscore.",
    };
  }
  return { ok: true };
}
