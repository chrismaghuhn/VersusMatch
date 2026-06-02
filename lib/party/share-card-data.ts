import type { CaptionDocument } from "@/lib/party/caption-rich/types";
import type { PartySnapshot, TextBox } from "@/lib/party/types";
import type { AvatarId } from "@/lib/party/avatar-ids";
import { decodePartyAvatar } from "@/lib/party/avatar";
import { getPartyTemplateUrl } from "@/lib/party/template-url";
import { limitTextBoxes } from "@/lib/party/limit-text-boxes";

export type ShareCardData = {
  roomCode: string;
  roundCount: number;
  gameWinners: Array<{
    handle: string;
    score: number;
    isYou: boolean;
    avatarId: AvatarId;
    avatarColor: string;
  }>;
  roundWinner: {
    handle: string;
    caption: string;
    captionRich?: CaptionDocument | null;
    voteCount: number;
    avatarId: AvatarId;
    avatarColor: string;
    template: PartySnapshot["room"]["template"];
  } | null;
  template: PartySnapshot["room"]["template"];
};

type PartyRecapTemplateRow = {
  id: string;
  image_path: string;
  text_boxes: unknown;
};

function asTextBoxes(raw: unknown): TextBox[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (box): box is TextBox =>
      Boolean(box) &&
      typeof box === "object" &&
      typeof (box as { id?: unknown }).id === "string" &&
      typeof (box as { x?: unknown }).x === "number"
  );
}

export function toPartyTemplateViewFromRecap(
  row: PartyRecapTemplateRow
): PartySnapshot["room"]["template"] {
  return {
    id: row.id,
    imageUrl: getPartyTemplateUrl(row.image_path) ?? "",
    textBoxes: limitTextBoxes(asTextBoxes(row.text_boxes)),
  };
}

export type PartyRecapParseResult =
  | { ok: true; data: ShareCardData; templateId: string | null }
  | { ok: false; error: string };

export function parsePartyRecap(
  raw: unknown,
  template?: PartySnapshot["room"]["template"] | null
): PartyRecapParseResult {
  if (!raw || typeof raw !== "object" || !("ok" in raw)) {
    return { ok: false, error: "invalid_response" };
  }
  const row = raw as Record<string, unknown>;
  if (row.ok !== true) {
    return { ok: false, error: String(row.error ?? "unknown") };
  }

  const winnerRows = Array.isArray(row.gameWinners) ? row.gameWinners : [];
  const gameWinners = winnerRows.map((winner) => {
    const entry = winner as Record<string, unknown>;
    const avatar = decodePartyAvatar(
      typeof entry.avatarUrl === "string" ? entry.avatarUrl : null
    );
    return {
      handle: String(entry.handle ?? "?"),
      score: Number(entry.score ?? 0),
      isYou: false,
      avatarId: avatar.id,
      avatarColor: avatar.color,
    };
  });

  const roundWinnerRow =
    row.roundWinner && typeof row.roundWinner === "object"
      ? (row.roundWinner as Record<string, unknown>)
      : null;
  const roundWinner = roundWinnerRow
    ? (() => {
        const avatar = decodePartyAvatar(null);
        return {
        handle: String(roundWinnerRow.handle ?? "?"),
        caption: String(roundWinnerRow.caption ?? ""),
        captionRich:
          roundWinnerRow.captionRich &&
          typeof roundWinnerRow.captionRich === "object"
            ? (roundWinnerRow.captionRich as CaptionDocument)
            : null,
        voteCount: Number(roundWinnerRow.voteCount ?? 0),
        avatarId: avatar.id,
        avatarColor: avatar.color,
        template: template ?? null,
      };
    })()
    : null;

  const templateId =
    roundWinnerRow && typeof roundWinnerRow.templateId === "string"
      ? roundWinnerRow.templateId
      : null;

  return {
    ok: true,
    templateId,
    data: {
      roomCode: String(row.roomCode ?? ""),
      roundCount: Number(row.roundCount ?? 0),
      gameWinners,
      roundWinner,
      template: template ?? null,
    },
  };
}

export function parsePartyRecapTemplateId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!row.roundWinner || typeof row.roundWinner !== "object") return null;
  const roundWinner = row.roundWinner as Record<string, unknown>;
  return typeof roundWinner.templateId === "string" ? roundWinner.templateId : null;
}

export function buildShareCardData(snapshot: PartySnapshot): ShareCardData {
  const ranked = [...snapshot.players].sort((a, b) => b.score - a.score);
  const topScore = ranked[0]?.score ?? 0;
  const gameWinners = ranked
    .filter((p) => p.score === topScore && topScore > 0)
    .map((p) => {
      const avatar = decodePartyAvatar(p.avatarUrl);
      return {
        handle: p.isYou ? "you" : p.handle,
        score: p.score,
        isYou: p.isYou,
        avatarId: avatar.id,
        avatarColor: avatar.color,
      };
    });

  let roundWinner: ShareCardData["roundWinner"] = null;
  const withVotes = snapshot.submissions.filter((s) => s.voteCount !== undefined);
  if (withVotes.length > 0) {
    const best = withVotes.reduce((a, b) => ((b.voteCount ?? 0) > (a.voteCount ?? 0) ? b : a));
    const author = snapshot.players.find((p) => p.userId === best.userId);
    const avatar = decodePartyAvatar(author?.avatarUrl);
    roundWinner = {
      handle: author?.isYou ? "you" : (author?.handle ?? "?"),
      caption: best.caption,
      captionRich: best.captionRich ?? null,
      voteCount: best.voteCount ?? 0,
      avatarId: avatar.id,
      avatarColor: avatar.color,
      template: best.template ?? null,
    };
  }

  const roundTemplate = roundWinner?.template ?? null;

  return {
    roomCode: snapshot.room.code,
    roundCount: snapshot.room.roundCount,
    gameWinners,
    roundWinner,
    template: roundTemplate,
  };
}

export function buildShareTweetText(data: ShareCardData, joinUrl: string): string {
  const winnerLine =
    data.gameWinners.length === 1
      ? `@${data.gameWinners[0]!.handle} won`
      : data.gameWinners.length > 1
        ? `${data.gameWinners.length}-way tie`
        : "We finished";

  const roundLine = data.roundWinner
    ? ` Last round: "${data.roundWinner.caption.slice(0, 60)}${data.roundWinner.caption.length > 60 ? "…" : ""}" (${data.roundWinner.voteCount} votes).`
    : "";

  return `${winnerLine} in MemeFight Party room ${data.roomCode}.${roundLine}\n\nPlay → ${joinUrl}`;
}
