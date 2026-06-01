import type { CaptionSegment, CaptionSegmentStyle } from "./types.ts";

export type ToolbarAction = "slant" | "scaleUp" | "scaleDown" | "caps";

export type TextSelection = { start: number; end: number };

const SLANT_DEG = -12;
const SCALE_STEP = 0.1;
const SCALE_MIN = 0.75;
const SCALE_MAX = 1.35;

function clampScale(scale: number): number {
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));
}

function segmentsPlainText(segments: CaptionSegment[]): string {
  return segments.map((s) => s.text).join("");
}

function mergeStyle(
  style: CaptionSegmentStyle | undefined,
  patch: Partial<CaptionSegmentStyle>
): CaptionSegmentStyle | undefined {
  const next = { ...style, ...patch };
  const cleaned = Object.fromEntries(
    Object.entries(next).filter(([, v]) => v !== undefined)
  ) as CaptionSegmentStyle;
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function resolveRange(
  segments: CaptionSegment[],
  selection: TextSelection | null
): { start: number; end: number } {
  const len = segmentsPlainText(segments).length;
  if (!selection || selection.start === selection.end) {
    return { start: 0, end: len };
  }
  const start = Math.max(0, Math.min(selection.start, len));
  const end = Math.max(start, Math.min(selection.end, len));
  return { start, end };
}

type SplitParts = {
  before: CaptionSegment[];
  middle: CaptionSegment[];
  after: CaptionSegment[];
};

function splitSegmentsAt(segments: CaptionSegment[], start: number, end: number): SplitParts {
  if (start >= end) {
    return { before: segments, middle: [], after: [] };
  }

  const before: CaptionSegment[] = [];
  const middle: CaptionSegment[] = [];
  const after: CaptionSegment[] = [];
  let offset = 0;

  for (const seg of segments) {
    const segStart = offset;
    const segEnd = offset + seg.text.length;

    if (segEnd <= start) {
      before.push(seg);
    } else if (segStart >= end) {
      after.push(seg);
    } else {
      const sliceStart = Math.max(0, start - segStart);
      const sliceEnd = Math.min(seg.text.length, end - segStart);
      if (sliceStart > 0) {
        before.push({ text: seg.text.slice(0, sliceStart), style: seg.style });
      }
      middle.push({
        text: seg.text.slice(sliceStart, sliceEnd),
        style: seg.style ? { ...seg.style } : undefined,
      });
      if (sliceEnd < seg.text.length) {
        after.push({ text: seg.text.slice(sliceEnd), style: seg.style });
      }
    }

    offset = segEnd;
  }

  return { before, middle, after };
}

function concatParts(...groups: CaptionSegment[][]): CaptionSegment[] {
  const out: CaptionSegment[] = [];
  for (const group of groups) {
    for (const seg of group) {
      if (seg.text.length === 0) continue;
      const last = out[out.length - 1];
      if (last && styleKey(last.style) === styleKey(seg.style)) {
        last.text += seg.text;
      } else {
        out.push({ text: seg.text, style: seg.style ? { ...seg.style } : undefined });
      }
    }
  }
  return out.length > 0 ? out : [{ text: "" }];
}

function styleKey(style: CaptionSegmentStyle | undefined): string {
  return JSON.stringify(style ?? null);
}

function mapMiddleSegments(
  middle: CaptionSegment[],
  mapStyle: (style: CaptionSegmentStyle | undefined) => CaptionSegmentStyle | undefined
): CaptionSegment[] {
  return middle.map((seg) => ({
    text: seg.text,
    style: mapStyle(seg.style),
  }));
}

function middleHasSlant(middle: CaptionSegment[]): boolean {
  return middle.some((s) => s.style?.slant != null && s.style.slant !== 0);
}

function middleCapsOff(middle: CaptionSegment[]): boolean {
  return middle.length > 0 && middle.every((s) => s.style?.caps === false);
}

/** Apply a toolbar action to parsed segments (selection or whole box). */
export function applyToolbarToSegments(
  segments: CaptionSegment[],
  selection: TextSelection | null,
  action: ToolbarAction
): CaptionSegment[] {
  const { start, end } = resolveRange(segments, selection);
  const { before, middle, after } = splitSegmentsAt(segments, start, end);

  if (middle.length === 0) {
    return segments.length > 0 ? segments : [{ text: "" }];
  }

  let styledMiddle: CaptionSegment[];

  switch (action) {
    case "slant": {
      const on = middleHasSlant(middle);
      styledMiddle = mapMiddleSegments(middle, (style) =>
        on ? mergeStyle(style, { slant: undefined }) : mergeStyle(style, { slant: SLANT_DEG })
      );
      break;
    }
    case "scaleUp": {
      styledMiddle = mapMiddleSegments(middle, (style) =>
        mergeStyle(style, { scale: clampScale((style?.scale ?? 1) + SCALE_STEP) })
      );
      break;
    }
    case "scaleDown": {
      styledMiddle = mapMiddleSegments(middle, (style) =>
        mergeStyle(style, { scale: clampScale((style?.scale ?? 1) - SCALE_STEP) })
      );
      break;
    }
    case "caps": {
      const lower = middleCapsOff(middle);
      styledMiddle = mapMiddleSegments(middle, (style) =>
        lower ? mergeStyle(style, { caps: undefined }) : mergeStyle(style, { caps: false })
      );
      break;
    }
    default:
      styledMiddle = middle;
  }

  return concatParts(before, styledMiddle, after);
}
