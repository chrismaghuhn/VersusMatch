"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CAPTION_MAX_LENGTH } from "@/lib/party/caption";
import {
  buildCaptionFromFieldTexts,
  clampCaptionFieldTexts,
  splitCaptionToFieldTexts,
} from "@/lib/party/caption-fields";
import type { CanvasSubmitOptions, CaptionSubmitPayload } from "@/lib/party/caption-submit";
import { prepareCaptionSubmit } from "@/lib/party/caption-submit";
import { finalizeCaptionDocumentV3 } from "@/lib/party/caption-rich/document";
import { defaultTemplateBoxes, nextCustomBox } from "@/lib/party/caption-rich/layout";
import { parseMarkup } from "@/lib/party/caption-rich/parse-markup";
import { plainTextLengthFromBoxes } from "@/lib/party/caption-rich/plain-text";
import {
  applyToolbarToSegments,
  type TextSelection,
  type ToolbarAction,
} from "@/lib/party/caption-rich/segment-toolbar";
import type {
  BoxLayout,
  CaptionBox,
  CaptionDocument,
  CaptionDocumentV3,
  CaptionSegment,
} from "@/lib/party/caption-rich/types";
import type { TextBox } from "@/lib/party/types";
import { useCaptionStudio } from "./use-caption-studio";

const PREVIEW_DEBOUNCE_MS = 500;
const DRAFT_SYNC_MS = 2000;

function emptyOverrides(boxCount: number): (CaptionSegment[] | null)[] {
  return Array.from({ length: boxCount }, () => null);
}

function emptyFieldTexts(boxCount: number): string[] {
  return Array.from({ length: boxCount }, () => "");
}

function buildPreviewBoxesV3(
  boxes: CaptionBox[],
  fieldTexts: string[],
  segmentOverrides: (CaptionSegment[] | null)[]
): CaptionBox[] {
  return boxes.map((box, i) => ({
    ...box,
    segments: segmentOverrides[i] ?? parseMarkup(fieldTexts[i] ?? ""),
  }));
}

export type UseMemeCanvasEditorParams = {
  value: string;
  onChange: (value: string) => void;
  textBoxes: TextBox[];
  canvasEnabled: boolean;
  layoutRevision: number;
  captionDraft: CaptionDocumentV3 | null;
  roomId: string;
};

export function useMemeCanvasEditor({
  value,
  onChange,
  textBoxes,
  canvasEnabled,
  layoutRevision,
  captionDraft,
  roomId,
}: UseMemeCanvasEditorParams) {
  const boxCount = Math.max(1, Math.min(4, textBoxes.length));
  const studio = useCaptionStudio(value, onChange, boxCount);

  const layoutRevisionRef = useRef(layoutRevision);
  const skipDebounceRef = useRef(false);
  const skipDraftSyncRef = useRef(false);

  const initialBoxes =
    captionDraft?.v === 3 ? captionDraft.boxes : defaultTemplateBoxes(textBoxes);
  const initialFieldCount = initialBoxes.length;

  const [boxes, setBoxes] = useState<CaptionBox[]>(() => initialBoxes);
  const [fieldTexts, setFieldTexts] = useState<string[]>(() =>
    captionDraft?.v === 3
      ? captionDraft.rawTexts
      : splitCaptionToFieldTexts(value, initialFieldCount)
  );
  const [segmentOverrides, setSegmentOverrides] = useState<(CaptionSegment[] | null)[]>(() =>
    emptyOverrides(initialFieldCount)
  );
  const [previewDoc, setPreviewDoc] = useState<CaptionDocumentV3>(() => ({
    v: 3,
    layoutRevision,
    rawTexts: fieldTexts,
    boxes: buildPreviewBoxesV3(boxes, fieldTexts, emptyOverrides(initialFieldCount)),
  }));
  const [activeBoxId, setActiveBoxId] = useState<string>(() => textBoxes[0]?.id ?? "box-0");
  const [layoutFrozen, setLayoutFrozen] = useState(false);

  const resetCanvasFromRevision = useCallback(
    (revision: number, draft: CaptionDocumentV3 | null) => {
      layoutRevisionRef.current = revision;

      const nextBoxes =
        draft?.v === 3 ? draft.boxes : defaultTemplateBoxes(textBoxes);
      const nextTexts =
        draft?.v === 3 ? draft.rawTexts : emptyFieldTexts(nextBoxes.length);

      skipDebounceRef.current = true;
      skipDraftSyncRef.current = true;
      setBoxes(nextBoxes);
      setFieldTexts(nextTexts);
      setSegmentOverrides(emptyOverrides(nextBoxes.length));
      setActiveBoxId(nextBoxes[0]?.id ?? textBoxes[0]?.id ?? "box-0");
      onChange(buildCaptionFromFieldTexts(nextTexts));
    },
    [textBoxes, onChange]
  );

  useEffect(() => {
    if (!canvasEnabled) return;
    if (layoutRevision === layoutRevisionRef.current) return;
    resetCanvasFromRevision(layoutRevision, captionDraft);
  }, [
    layoutRevision,
    captionDraft,
    canvasEnabled,
    resetCanvasFromRevision,
  ]);

  useEffect(() => {
    if (!canvasEnabled) return;

    const previewBoxes = buildPreviewBoxesV3(boxes, fieldTexts, segmentOverrides);
    const doc: CaptionDocumentV3 = {
      v: 3,
      layoutRevision: layoutRevisionRef.current,
      rawTexts: fieldTexts,
      boxes: previewBoxes,
    };

    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      setPreviewDoc(doc);
      return;
    }

    const timer = window.setTimeout(() => setPreviewDoc(doc), PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [boxes, fieldTexts, segmentOverrides, canvasEnabled]);

  useEffect(() => {
    if (!canvasEnabled || !roomId) return;

    if (skipDraftSyncRef.current) {
      skipDraftSyncRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      const trimmed = clampCaptionFieldTexts(fieldTexts);
      const draft = finalizeCaptionDocumentV3({
        boxes,
        layoutRevision: layoutRevisionRef.current,
        rawTexts: trimmed.slice(0, boxes.length),
        segmentOverrides,
      });

      void fetch("/api/party/sync-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          draft,
          layoutRevision: layoutRevisionRef.current,
        }),
      });
    }, DRAFT_SYNC_MS);

    return () => window.clearTimeout(timer);
  }, [previewDoc, boxes, canvasEnabled, roomId, fieldTexts, segmentOverrides]);

  const activeBoxIndex = useMemo(
    () => boxes.findIndex((b) => b.id === activeBoxId),
    [boxes, activeBoxId]
  );

  const canAddCustomBox = useMemo(() => nextCustomBox(boxes) !== null, [boxes]);
  const canDeleteActiveCustomBox =
    activeBoxIndex >= 0 && boxes[activeBoxIndex]?.kind === "custom";
  const hasCustomBoxes = useMemo(
    () => boxes.some((b) => b.kind === "custom"),
    [boxes]
  );

  const plainLength = useMemo(
    () => plainTextLengthFromBoxes(buildPreviewBoxesV3(boxes, fieldTexts, segmentOverrides)),
    [boxes, fieldTexts, segmentOverrides]
  );

  const remaining = CAPTION_MAX_LENGTH - plainLength;

  const canvasSubmitOptions: CanvasSubmitOptions = useMemo(
    () => ({
      canvasEnabled: true,
      boxes,
      layoutRevision: layoutRevisionRef.current,
      templateBoxes: textBoxes,
    }),
    [boxes, textBoxes, layoutRevision]
  );

  const submitPayload: CaptionSubmitPayload | null = useMemo(
    () =>
      canvasEnabled
        ? prepareCaptionSubmit(fieldTexts, boxes.length, segmentOverrides, canvasSubmitOptions)
        : null,
    [canvasEnabled, fieldTexts, boxes.length, segmentOverrides, canvasSubmitOptions]
  );

  const updateField = useCallback(
    (index: number, nextValue: string) => {
      const next = [...fieldTexts];
      next[index] = nextValue;
      const clamped = clampCaptionFieldTexts(next);
      setFieldTexts(clamped);
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

  const updateBoxLayout = useCallback((boxId: string, layout: BoxLayout) => {
    setBoxes((prev) =>
      prev.map((box) => (box.id === boxId ? { ...box, layout } : box))
    );
  }, []);

  const onInteractionStart = useCallback(() => setLayoutFrozen(true), []);
  const onInteractionEnd = useCallback(() => setLayoutFrozen(false), []);

  const addCustomBox = useCallback(() => {
    const next = nextCustomBox(boxes);
    if (!next) return;
    setBoxes((prev) => [...prev, next]);
    setFieldTexts((prev) => [...prev, ""]);
    setSegmentOverrides((prev) => [...prev, null]);
    setActiveBoxId(next.id);
    skipDebounceRef.current = false;
  }, [boxes]);

  const deleteActiveCustomBox = useCallback(() => {
    const idx = boxes.findIndex((b) => b.id === activeBoxId);
    if (idx < 0 || boxes[idx]?.kind !== "custom") return;

    const nextBoxes = boxes.filter((_, i) => i !== idx);
    const nextTexts = fieldTexts.filter((_, i) => i !== idx);
    const nextOverrides = segmentOverrides.filter((_, i) => i !== idx);
    const nextActiveId =
      nextBoxes[Math.min(idx, nextBoxes.length - 1)]?.id ??
      textBoxes[0]?.id ??
      "box-0";

    setBoxes(nextBoxes);
    setFieldTexts(nextTexts);
    setSegmentOverrides(nextOverrides);
    setActiveBoxId(nextActiveId);
    skipDebounceRef.current = false;
    onChange(buildCaptionFromFieldTexts(nextTexts));
  }, [boxes, activeBoxId, fieldTexts, segmentOverrides, textBoxes, onChange]);

  const resetLayout = useCallback(() => {
    const templateOnly = defaultTemplateBoxes(textBoxes);
    const nextTexts = templateOnly.map((tb) => {
      const existingIdx = boxes.findIndex(
        (b) => b.kind === "template" && b.templateIndex === tb.templateIndex
      );
      return existingIdx >= 0 ? (fieldTexts[existingIdx] ?? "") : "";
    });

    skipDebounceRef.current = false;
    setBoxes(templateOnly);
    setFieldTexts(nextTexts);
    setSegmentOverrides(emptyOverrides(templateOnly.length));
    setActiveBoxId(templateOnly[0]?.id ?? textBoxes[0]?.id ?? "box-0");
    onChange(buildCaptionFromFieldTexts(nextTexts));
  }, [textBoxes, boxes, fieldTexts, onChange]);

  if (!canvasEnabled) {
    return studio;
  }

  return {
    fieldTexts,
    previewDoc: previewDoc as CaptionDocument,
    remaining,
    submitPayload,
    updateField,
    applyToolbar,
    activeBoxId,
    setActiveBoxId,
    activeBoxIndex,
    layoutFrozen,
    boxes,
    updateBoxLayout,
    onInteractionStart,
    onInteractionEnd,
    addCustomBox,
    deleteActiveCustomBox,
    resetLayout,
    canAddCustomBox,
    canDeleteActiveCustomBox,
    hasCustomBoxes,
    resetCanvasFromRevision,
  };
}
