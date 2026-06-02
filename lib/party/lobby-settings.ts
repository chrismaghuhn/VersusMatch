export const LOBBY_SETTINGS_KEYS = [
  "round_count",
  "rerolls_per_player",
  "caption_duration_seconds",
  "vote_duration_seconds",
  "max_players",
  "canvas_editor_enabled",
  "round_modifiers_enabled",
  "author_guess_enabled",
] as const;

export type LobbySettingsKey = (typeof LOBBY_SETTINGS_KEYS)[number];
export type LobbySettingsPatch = Partial<
  Record<
    LobbySettingsKey,
    number | boolean
  >
>;

const ROUND_COUNTS = new Set([3, 5, 7]);
const VOTE_SECONDS = new Set([20, 30, 45]);

const NUMERIC_KEYS = new Set([
  "round_count",
  "rerolls_per_player",
  "caption_duration_seconds",
  "vote_duration_seconds",
  "max_players",
]);

function requireInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export type LobbySettingsValidationContext = {
  /** Current room round_count — required for rerolls-only patches at API layer */
  roundCount?: number;
};

export function validateLobbySettingsPatch(
  input: Record<string, unknown>,
  context?: LobbySettingsValidationContext
): { ok: true; patch: LobbySettingsPatch } | { ok: false; error: "invalid_settings" } {
  const keys = Object.keys(input);
  if (keys.length === 0) return { ok: false, error: "invalid_settings" };

  const patch: LobbySettingsPatch = {};
  for (const key of keys) {
    if (!(LOBBY_SETTINGS_KEYS as readonly string[]).includes(key)) {
      return { ok: false, error: "invalid_settings" };
    }
    const value = input[key];
    if (value === null || value === undefined) {
      return { ok: false, error: "invalid_settings" };
    }
    if (NUMERIC_KEYS.has(key) && !requireInt(value)) {
      return { ok: false, error: "invalid_settings" };
    }
    if (
      (key === "canvas_editor_enabled" ||
        key === "round_modifiers_enabled" ||
        key === "author_guess_enabled") &&
      typeof value !== "boolean"
    ) {
      return { ok: false, error: "invalid_settings" };
    }
    (patch as Record<string, unknown>)[key] = value;
  }

  if (patch.round_count !== undefined) {
    if (!requireInt(patch.round_count) || !ROUND_COUNTS.has(patch.round_count)) {
      return { ok: false, error: "invalid_settings" };
    }
  }
  if (patch.vote_duration_seconds !== undefined) {
    if (!requireInt(patch.vote_duration_seconds) || !VOTE_SECONDS.has(patch.vote_duration_seconds)) {
      return { ok: false, error: "invalid_settings" };
    }
  }
  if (patch.caption_duration_seconds !== undefined) {
    if (!requireInt(patch.caption_duration_seconds)) {
      return { ok: false, error: "invalid_settings" };
    }
    const c = patch.caption_duration_seconds;
    if (c < 30 || c > 120 || c % 15 !== 0) return { ok: false, error: "invalid_settings" };
  }
  if (patch.max_players !== undefined) {
    if (!requireInt(patch.max_players)) {
      return { ok: false, error: "invalid_settings" };
    }
    const m = patch.max_players;
    if (m < 2 || m > 8) return { ok: false, error: "invalid_settings" };
  }
  if (
    patch.rerolls_per_player !== undefined &&
    (!requireInt(patch.rerolls_per_player) || patch.rerolls_per_player < 0)
  ) {
    return { ok: false, error: "invalid_settings" };
  }

  const effectiveRounds = patch.round_count ?? context?.roundCount;
  if (
    patch.rerolls_per_player !== undefined &&
    requireInt(patch.rerolls_per_player) &&
    effectiveRounds !== undefined &&
    patch.rerolls_per_player > effectiveRounds
  ) {
    return { ok: false, error: "invalid_settings" };
  }

  return { ok: true, patch };
}
