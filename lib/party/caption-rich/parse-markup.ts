import type { CaptionSegment, CaptionSegmentStyle } from "./types.ts";

type MarkerDef = {
  delimiter: string;
  style: CaptionSegmentStyle;
};

const MARKERS: MarkerDef[] = [
  { delimiter: "~", style: { slant: -12 } },
  { delimiter: "*", style: { italic: true } },
  { delimiter: "_", style: { italic: true } },
  { delimiter: "^", style: { scale: 1.2 } },
  { delimiter: ",", style: { scale: 0.85 } },
];

const ESCAPED_CHARS = new Set(["~", "*", "_", "^", ",", "\\"]);

function findClosingDelimiter(raw: string, start: number, delimiter: string): number {
  let i = start;
  while (i < raw.length) {
    if (raw[i] === "\\" && i + 1 < raw.length) {
      i += 2;
      continue;
    }
    if (raw[i] === delimiter) {
      return i;
    }
    i++;
  }
  return -1;
}

function pushPlain(segments: CaptionSegment[], text: string): void {
  if (text.length === 0) {
    return;
  }
  const last = segments[segments.length - 1];
  if (last && !last.style) {
    last.text += text;
    return;
  }
  segments.push({ text });
}

function pushStyled(segments: CaptionSegment[], text: string, style: CaptionSegmentStyle): void {
  if (text.length === 0) {
    return;
  }
  segments.push({ text, style: { ...style } });
}

function parseMarkupInternal(raw: string, finalize: boolean): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  let plain = "";
  let i = 0;

  const flushPlain = () => {
    pushPlain(segments, plain);
    plain = "";
  };

  while (i < raw.length) {
    const ch = raw[i];

    if (ch === "\\" && i + 1 < raw.length && ESCAPED_CHARS.has(raw[i + 1]!)) {
      plain += raw[i + 1];
      i += 2;
      continue;
    }

    const marker = MARKERS.find((m) => m.delimiter === ch);
    if (marker) {
      const close = findClosingDelimiter(raw, i + 1, marker.delimiter);
      if (close !== -1) {
        flushPlain();
        pushStyled(segments, raw.slice(i + 1, close), marker.style);
        i = close + 1;
        continue;
      }

      if (finalize) {
        plain += raw.slice(i);
        break;
      }

      plain += ch;
      i++;
      continue;
    }

    plain += ch;
    i++;
  }

  flushPlain();
  return segments.length > 0 ? segments : [{ text: "" }];
}

/** Best-effort parse while typing; unclosed openers stay literal until closed. */
export function parseMarkup(raw: string): CaptionSegment[] {
  return parseMarkupInternal(raw, false);
}

/** Synchronous full parse on submit; unclosed markers become plain text. */
export function finalizeBox(raw: string): CaptionSegment[] {
  return parseMarkupInternal(raw, true);
}
