"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CAPTION_MAX_LENGTH } from "@/lib/party/caption";
import {
  buildCaptionFromFieldTexts,
  clampCaptionFieldTexts,
  splitCaptionToFieldTexts,
} from "@/lib/party/caption-fields";
import type { CaptionSubmitPayload } from "@/lib/party/caption-submit";
import { prepareCaptionSubmit } from "@/lib/party/caption-submit";
import { parseMarkup } from "@/lib/party/caption-rich/parse-markup";
import { plainTextLength } from "@/lib/party/caption-rich/plain-text";
import {
  applyToolbarToSegments,
  type TextSelection,
  type ToolbarAction,
} from "@/lib/party/caption-rich/segment-toolbar";
import type { CaptionDocument, CaptionSegment } from "@/lib/party/caption-rich/types";

const PREVIEW_DEBOUNCE_MS = 500;

function buildPreviewBoxes(
  fieldTexts: string[],
  boxCount: number,
  segmentOverrides: (CaptionSegment[] | null)[]
): CaptionSegment[][] {
  return Array.from({ length: boxCount }, (_, i) => {
    const override = segmentOverrides[i];
    if (override) return override;
    return parseMarkup(fieldTexts[i] ?? "");
  });
}

function emptyOverrides(boxCount: number): (CaptionSegment[] | null)[] {
  return Array.from({ length: boxCount }, () => null);
}

export function useCaptionStudio(value: string, onChange: (value: string) => void, boxCount: number) {
  const fieldTexts = splitCaptionToFieldTexts(value, boxCount);
  const [segmentOverrides, setSegmentOverrides] = useState<(CaptionSegment[] | null)[]>(() =>
    emptyOverrides(boxCount)
  );
  const [previewDoc, setPreviewDoc] = useState<CaptionDocument>(() => ({
    v: 2,
    boxes: buildPreviewBoxes(fieldTexts, boxCount, emptyOverrides(boxCount)),
  }));
  const skipDebounceRef = useRef(false);

  useEffect(() => {
    setSegmentOverrides((prev) => emptyOverrides(boxCount).map((_, i) => prev[i] ?? null));
  }, [boxCount]);

  useEffect(() => {
    const boxes = buildPreviewBoxes(fieldTexts, boxCount, segmentOverrides);
    const doc: CaptionDocument = { v: 2, boxes };

    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      setPreviewDoc(doc);
      return;
    }

    const timer = window.setTimeout(() => setPreviewDoc(doc), PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [fieldTexts, segmentOverrides, boxCount]);

  const plainLength = useMemo(
    () => plainTextLength({ v: 2, boxes: buildPreviewBoxes(fieldTexts, boxCount, segmentOverrides) }),
    [fieldTexts, segmentOverrides, boxCount]
  );

  const remaining = CAPTION_MAX_LENGTH - plainLength;

  const submitPayload: CaptionSubmitPayload | null = useMemo(
    () => prepareCaptionSubmit(fieldTexts, boxCount, segmentOverrides),
    [fieldTexts, boxCount, segmentOverrides]
  );

  const updateField = useCallback(
    (index: number, nextValue: string) => {
      const next = [...fieldTexts];
      next[index] = nextValue;
      const clamped = clampCaptionFieldTexts(next);
      setSegmentOverrides((prev) => {
        const cleared = [...prev];
        cleared[index] = null;
        return cleared;
      });
      skipDebounceRef.current = false;
      onChange(buildCaptionFromFieldTexts(clamped));
    },
    [fieldTexts, onChange]
  );

  const applyToolbar = useCallback(
    (boxIndex: number, action: ToolbarAction, selection: TextSelection | null) => {
      const raw = fieldTexts[boxIndex] ?? "";
      const base = segmentOverrides[boxIndex] ?? parseMarkup(raw);
      const next = applyToolbarToSegments(base, selection, action);
      skipDebounceRef.current = true;
      setSegmentOverrides((prev) => {
        const updated = [...prev];
        updated[boxIndex] = next;
        return updated;
      });
    },
    [fieldTexts, segmentOverrides]
  );

  return {
    fieldTexts,
    previewDoc,
    remaining,
    submitPayload,
    updateField,
    applyToolbar,
  };
}
