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
import { defaultTemplateBoxes, nextCustomBox, bringBoxToFront, snapLayoutCenterHorizontal, snapLayoutCenterVertical } from "@/lib/party/caption-rich/layout";
import { parseMarkup } from "@/lib/party/caption-rich/parse-markup";
import { plainTextLengthFromBoxes } from "@/lib/party/caption-rich/plain-text";
import {
  applyToolbarToSegments,
  type TextSelection,
  type ToolbarAction,
} from "@/lib/party/caption-rich/segment-toolbar";
import {
  takeSnapshot,
  snapshotsEqual,
  type EditorSnapshot,
} from "@/lib/party/caption-rich/editor-snapshot";
import type {
  BoxLayout,
  BoxVisualStyle,
  CaptionBox,
  CaptionDocument,
  CaptionDocumentV3,
  CaptionSegment,
} from "@/lib/party/caption-rich/types";
import type { TextBox } from "@/lib/party/types";
import type { PartyRoundModifier } from "@/lib/party/round-modifiers";
import { useCaptionStudio } from "./use-caption-studio";

const PREVIEW_DEBOUNCE_MS = 500;
const DRAFT_SYNC_MS = 2000;
const TEXT_HISTORY_DEBOUNCE_MS = 500;
const MAX_UNDO = 10;

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
  currentModifier?: PartyRoundModifier | null;
};

export function useMemeCanvasEditor({
  value,
  onChange,
  textBoxes,
  canvasEnabled,
  layoutRevision,
  captionDraft,
  roomId,
  currentModifier = null,
}: UseMemeCanvasEditorParams) {
  const boxCount = Math.max(1, Math.min(4, textBoxes.length));
  const studio = useCaptionStudio(value, onChange, boxCount);

  const layoutRevisionRef = useRef(layoutRevision);
  const skipDebounceRef = useRef(false);
  const skipDraftSyncRef = useRef(false);
  const undoStackRef = useRef<EditorSnapshot[]>([]);
  const redoStackRef = useRef<EditorSnapshot[]>([]);
  const textHistoryBaselineRef = useRef<EditorSnapshot | null>(null);
  const textHistoryTimerRef = useRef<number | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const clearHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    textHistoryBaselineRef.current = null;
    if (textHistoryTimerRef.current !== null) {
      window.clearTimeout(textHistoryTimerRef.current);
      textHistoryTimerRef.current = null;
    }
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  const pushUndo = useCallback((snapshot: EditorSnapshot) => {
    const stack = undoStackRef.current;
    stack.push(snapshot);
    if (stack.length > MAX_UNDO) {
      stack.shift();
    }
    redoStackRef.current = [];
    setCanUndo(stack.length > 0);
    setCanRedo(false);
  }, []);

  const applySnapshot = useCallback(
    (snapshot: EditorSnapshot) => {
      skipDebounceRef.current = true;
      skipDraftSyncRef.current = true;
      setBoxes(snapshot.boxes);
      setFieldTexts(snapshot.fieldTexts);
      setSegmentOverrides(snapshot.segmentOverrides);
      onChange(buildCaptionFromFieldTexts(snapshot.fieldTexts));
    },
    [onChange]
  );

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
  const [activeBoxId, setActiveBoxIdState] = useState<string | null>(
    () => textBoxes[0]?.id ?? "box-0"
  );
  const [peekMode, setPeekMode] = useState(false);
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
      clearHistory();
      setBoxes(nextBoxes);
      setFieldTexts(nextTexts);
      setSegmentOverrides(emptyOverrides(nextBoxes.length));
      setActiveBoxIdState(nextBoxes[0]?.id ?? textBoxes[0]?.id ?? "box-0");
      setPeekMode(false);
      onChange(buildCaptionFromFieldTexts(nextTexts));
    },
    [textBoxes, onChange, clearHistory]
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
      currentModifier,
    }),
    [boxes, textBoxes, layoutRevision, currentModifier]
  );

  const submitPayload: CaptionSubmitPayload | null = useMemo(
    () =>
      canvasEnabled
        ? prepareCaptionSubmit(fieldTexts, boxes.length, segmentOverrides, canvasSubmitOptions)
        : prepareCaptionSubmit(fieldTexts, boxCount, segmentOverrides, undefined, currentModifier),
    [
      canvasEnabled,
      fieldTexts,
      boxes.length,
      boxCount,
      segmentOverrides,
      canvasSubmitOptions,
      currentModifier,
    ]
  );

  const commitTextHistory = useCallback(() => {
    const baseline = textHistoryBaselineRef.current;
    if (!baseline) return;
    textHistoryBaselineRef.current = null;
    if (textHistoryTimerRef.current !== null) {
      window.clearTimeout(textHistoryTimerRef.current);
      textHistoryTimerRef.current = null;
    }
    const current = takeSnapshot(boxes, fieldTexts, segmentOverrides);
    if (snapshotsEqual(baseline, current)) return;
    pushUndo(baseline);
  }, [boxes, fieldTexts, segmentOverrides, pushUndo]);

  const onCaptionFieldFocus = useCallback(() => {
    if (textHistoryTimerRef.current !== null) {
      window.clearTimeout(textHistoryTimerRef.current);
      textHistoryTimerRef.current = null;
    }
    commitTextHistory();
    textHistoryBaselineRef.current = takeSnapshot(boxes, fieldTexts, segmentOverrides);
  }, [boxes, fieldTexts, segmentOverrides, commitTextHistory]);

  const scheduleTextHistoryCommit = useCallback(() => {
    if (textHistoryTimerRef.current !== null) {
      window.clearTimeout(textHistoryTimerRef.current);
    }
    textHistoryTimerRef.current = window.setTimeout(() => {
      textHistoryTimerRef.current = null;
      commitTextHistory();
    }, TEXT_HISTORY_DEBOUNCE_MS);
  }, [boxes, fieldTexts, segmentOverrides, commitTextHistory]);

  const pushLayoutUndo = useCallback(() => {
    commitTextHistory();
    pushUndo(takeSnapshot(boxes, fieldTexts, segmentOverrides));
  }, [boxes, fieldTexts, segmentOverrides, pushUndo, commitTextHistory]);

  const selectBox = useCallback(
    (boxId: string | null) => {
      if (boxId === null) {
        setActiveBoxIdState(null);
        return;
      }
      if (!boxes.some((b) => b.id === boxId)) return;

      const topId = [...boxes]
        .map((box, index) => ({ box, index }))
        .sort((a, b) => {
          const az = a.box.z ?? a.index;
          const bz = b.box.z ?? b.index;
          return az !== bz ? az - bz : a.index - b.index;
        })
        .at(-1)?.box.id;

      if (topId !== boxId) {
        pushLayoutUndo();
        setBoxes((prev) => bringBoxToFront(prev, boxId));
      }
      setActiveBoxIdState(boxId);
      setPeekMode(false);
    },
    [boxes, pushLayoutUndo]
  );

  const updateField = useCallback(
    (index: number, nextValue: string) => {
      if (!textHistoryBaselineRef.current) {
        textHistoryBaselineRef.current = takeSnapshot(boxes, fieldTexts, segmentOverrides);
      }
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
      scheduleTextHistoryCommit();
    },
    [fieldTexts, onChange, boxes, segmentOverrides, scheduleTextHistoryCommit]
  );

  const applyToolbar = useCallback(
    (boxIndex: number, action: ToolbarAction, selection: TextSelection | null) => {
      commitTextHistory();
      pushUndo(takeSnapshot(boxes, fieldTexts, segmentOverrides));
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
    [fieldTexts, segmentOverrides, boxes, commitTextHistory, pushUndo]
  );

  const updateBoxLayout = useCallback((boxId: string, layout: BoxLayout) => {
    setBoxes((prev) =>
      prev.map((box) => (box.id === boxId ? { ...box, layout } : box))
    );
  }, []);

  const mutateActiveBoxLayout = useCallback(
    (mutator: (layout: BoxLayout) => BoxLayout) => {
      if (!activeBoxId) return;
      const box = boxes.find((b) => b.id === activeBoxId);
      if (!box) return;
      pushLayoutUndo();
      updateBoxLayout(activeBoxId, mutator(box.layout));
    },
    [activeBoxId, boxes, pushLayoutUndo, updateBoxLayout]
  );

  const setActiveBoxAlign = useCallback(
    (align: BoxLayout["align"]) => {
      mutateActiveBoxLayout((layout) => ({ ...layout, align: align ?? "center" }));
    },
    [mutateActiveBoxLayout]
  );

  const snapActiveBoxHorizontal = useCallback(() => {
    mutateActiveBoxLayout(snapLayoutCenterHorizontal);
  }, [mutateActiveBoxLayout]);

  const snapActiveBoxVertical = useCallback(() => {
    mutateActiveBoxLayout(snapLayoutCenterVertical);
  }, [mutateActiveBoxLayout]);

  const togglePeekMode = useCallback(() => {
    setPeekMode((prev) => !prev);
  }, []);

  const onInteractionStart = useCallback(() => {
    commitTextHistory();
    pushUndo(takeSnapshot(boxes, fieldTexts, segmentOverrides));
    setLayoutFrozen(true);
  }, [boxes, fieldTexts, segmentOverrides, pushUndo, commitTextHistory]);

  const onInteractionEnd = useCallback(() => {
    setLayoutFrozen(false);
  }, []);

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    commitTextHistory();
    redoStackRef.current.push(takeSnapshot(boxes, fieldTexts, segmentOverrides));
    const previous = stack.pop()!;
    applySnapshot(previous);
    setCanUndo(stack.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, [boxes, fieldTexts, segmentOverrides, applySnapshot, commitTextHistory]);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    commitTextHistory();
    undoStackRef.current.push(takeSnapshot(boxes, fieldTexts, segmentOverrides));
    if (undoStackRef.current.length > MAX_UNDO) {
      undoStackRef.current.shift();
    }
    const next = stack.pop()!;
    applySnapshot(next);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(stack.length > 0);
  }, [boxes, fieldTexts, segmentOverrides, applySnapshot, commitTextHistory]);

  const addCustomBox = useCallback(() => {
    commitTextHistory();
    pushUndo(takeSnapshot(boxes, fieldTexts, segmentOverrides));
    const next = nextCustomBox(boxes);
    if (!next) return;
    setBoxes((prev) => [...prev, next]);
    setFieldTexts((prev) => [...prev, ""]);
    setSegmentOverrides((prev) => [...prev, null]);
    setActiveBoxIdState(next.id);
    skipDebounceRef.current = false;
  }, [boxes, fieldTexts, segmentOverrides, pushUndo, commitTextHistory]);

  const deleteActiveCustomBox = useCallback(() => {
    const idx = boxes.findIndex((b) => b.id === activeBoxId);
    if (idx < 0 || boxes[idx]?.kind !== "custom") return;

    commitTextHistory();
    pushUndo(takeSnapshot(boxes, fieldTexts, segmentOverrides));

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
    setActiveBoxIdState(nextActiveId);
    skipDebounceRef.current = false;
    onChange(buildCaptionFromFieldTexts(nextTexts));
  }, [
    boxes,
    activeBoxId,
    fieldTexts,
    segmentOverrides,
    textBoxes,
    onChange,
    pushUndo,
    commitTextHistory,
  ]);

  const updateBoxStyle = useCallback(
    (boxId: string, patch: Partial<BoxVisualStyle>) => {
      if (!boxId || !boxes.some((b) => b.id === boxId)) return;
      commitTextHistory();
      pushUndo(takeSnapshot(boxes, fieldTexts, segmentOverrides));
      setBoxes((prev) =>
        prev.map((box) => {
          if (box.id !== boxId) return box;
          const nextStyle = { ...box.style, ...patch };
          const cleaned = Object.fromEntries(
            Object.entries(nextStyle).filter(([, v]) => v !== undefined)
          ) as BoxVisualStyle;
          return {
            ...box,
            style: Object.keys(cleaned).length > 0 ? cleaned : undefined,
          };
        })
      );
    },
    [boxes, fieldTexts, segmentOverrides, pushUndo, commitTextHistory]
  );

  const toggleBoxPill = useCallback(
    (boxId: string) => {
      const box = boxes.find((b) => b.id === boxId);
      if (!box) return;
      updateBoxStyle(boxId, { pill: !(box.style?.pill ?? false) });
    },
    [boxes, updateBoxStyle]
  );

  const resetLayout = useCallback(() => {
    commitTextHistory();
    pushUndo(takeSnapshot(boxes, fieldTexts, segmentOverrides));

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
    setActiveBoxIdState(templateOnly[0]?.id ?? textBoxes[0]?.id ?? "box-0");
    onChange(buildCaptionFromFieldTexts(nextTexts));
  }, [textBoxes, boxes, fieldTexts, segmentOverrides, onChange, pushUndo, commitTextHistory]);

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
    selectBox,
    setActiveBoxId: selectBox,
    activeBoxIndex,
    layoutFrozen,
    peekMode,
    togglePeekMode,
    setActiveBoxAlign,
    snapActiveBoxHorizontal,
    snapActiveBoxVertical,
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
    undo,
    redo,
    canUndo,
    canRedo,
    onCaptionFieldFocus,
    commitTextHistory,
    updateBoxStyle,
    toggleBoxPill,
  };
}
