import type {
  BoxVisualStyle,
  CaptionBox,
  CaptionSegment,
  CaptionSegmentStyle,
} from "./types.ts";

export type EditorSnapshot = {
  boxes: CaptionBox[];
  fieldTexts: string[];
  segmentOverrides: (CaptionSegment[] | null)[];
};

export function takeSnapshot(
  boxes: CaptionBox[],
  fieldTexts: string[],
  segmentOverrides: (CaptionSegment[] | null)[]
): EditorSnapshot {
  return {
    boxes: boxes.map((box) => ({
      ...box,
      layout: { ...box.layout },
      style: box.style ? { ...box.style } : undefined,
      segments: box.segments.map((segment) => ({ ...segment })),
    })),
    fieldTexts: [...fieldTexts],
    segmentOverrides: segmentOverrides.map((override) =>
      override ? override.map((segment) => ({ ...segment })) : null
    ),
  };
}

function segmentStyleEqual(
  a: CaptionSegmentStyle | undefined,
  b: CaptionSegmentStyle | undefined
): boolean {
  return (
    a?.fill === b?.fill &&
    a?.slant === b?.slant &&
    a?.scale === b?.scale &&
    a?.caps === b?.caps &&
    a?.italic === b?.italic
  );
}

function boxStyleEqual(
  a: BoxVisualStyle | undefined,
  b: BoxVisualStyle | undefined
): boolean {
  return a?.fill === b?.fill && a?.pill === b?.pill;
}

export function snapshotsEqual(a: EditorSnapshot, b: EditorSnapshot): boolean {
  if (a.fieldTexts.length !== b.fieldTexts.length) return false;
  if (a.fieldTexts.some((text, i) => text !== b.fieldTexts[i])) return false;
  if (a.segmentOverrides.length !== b.segmentOverrides.length) return false;
  for (let i = 0; i < a.segmentOverrides.length; i++) {
    const left = a.segmentOverrides[i];
    const right = b.segmentOverrides[i];
    if (left === null && right === null) continue;
    if (left === null || right === null) return false;
    if (left.length !== right.length) return false;
    for (let j = 0; j < left.length; j++) {
      if (left[j].text !== right[j]?.text) return false;
      if (!segmentStyleEqual(left[j].style, right[j]?.style)) return false;
    }
  }
  if (a.boxes.length !== b.boxes.length) return false;
  for (let i = 0; i < a.boxes.length; i++) {
    const left = a.boxes[i];
    const right = b.boxes[i];
    if (left.id !== right.id || left.kind !== right.kind) return false;
    if (!boxStyleEqual(left.style, right.style)) return false;
    if (
      left.layout.x !== right.layout.x ||
      left.layout.y !== right.layout.y ||
      left.layout.w !== right.layout.w ||
      left.layout.h !== right.layout.h ||
      left.layout.align !== right.layout.align
    ) {
      return false;
    }
    if ((left.z ?? i) !== (right.z ?? i)) return false;
  }
  return true;
}
