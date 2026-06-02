import assert from "node:assert/strict";
import { test } from "node:test";

import {
  finalizeCaptionDocument,
  finalizeCaptionDocumentV3,
  structuralDocumentFromFieldTexts,
} from "../lib/party/caption-rich/document.ts";
import { captionForFrame } from "../lib/party/caption-rich/legacy-read.ts";
import { finalizeBox, parseMarkup } from "../lib/party/caption-rich/parse-markup.ts";
import {
  plainTextLength,
  serializeCaptionPlain,
} from "../lib/party/caption-rich/plain-text.ts";
import { resolveSegmentFill, strokeStylesForFill } from "../lib/party/caption-rich/fill.ts";
import { applyToolbarToSegments } from "../lib/party/caption-rich/segment-toolbar.ts";
import { snapshotsEqual, takeSnapshot } from "../lib/party/caption-rich/editor-snapshot.ts";

test("serializeCaptionPlain uses newline between boxes not pipe", () => {
  const doc = { v: 2, boxes: [[{ text: "TOP" }], [{ text: "BOT" }]] };
  assert.equal(serializeCaptionPlain(doc), "TOP\nBOT");
  assert.notEqual(serializeCaptionPlain(doc), "TOP|BOT");
});

test("plainTextLength matches serialized plain length", () => {
  const doc = structuralDocumentFromFieldTexts(["hello", "world"]);
  assert.equal(plainTextLength(doc), serializeCaptionPlain(doc).length);
  assert.equal(plainTextLength(doc), 11);
});

test("structuralDocumentFromFieldTexts", () => {
  const doc = structuralDocumentFromFieldTexts(["TOP", "BOT"]);
  assert.equal(doc.v, 2);
  assert.deepEqual(doc.boxes, [[{ text: "TOP" }], [{ text: "BOT" }]]);
  assert.equal(serializeCaptionPlain(doc), "TOP\nBOT");
});

test("captionForFrame prefers rich over legacy pipe", () => {
  const doc = structuralDocumentFromFieldTexts(["A", "B", "C"]);
  const frame = captionForFrame({ caption: "legacy|pipe", captionRich: doc });
  assert.ok("rich" in frame);
  assert.equal(frame.rich.v, 2);
});

test("captionForFrame falls back to legacy caption", () => {
  const frame = captionForFrame({ caption: "top|bottom" });
  assert.ok("legacy" in frame);
  assert.equal(frame.legacy, "top|bottom");
});

test("immediate submit parses tilde markup", () => {
  const segs = finalizeBox("~hello~");
  assert.equal(segs.length, 1);
  assert.equal(segs[0].text, "hello");
  assert.equal(segs[0].style?.slant, -12);
});

test("finalizeCaptionDocument applies markup per box on submit", () => {
  const doc = finalizeCaptionDocument({ rawTexts: ["~hello~", "plain"] });
  assert.equal(doc.v, 2);
  assert.equal(doc.boxes[0][0].text, "hello");
  assert.equal(doc.boxes[0][0].style?.slant, -12);
  assert.deepEqual(doc.boxes[1], [{ text: "plain" }]);
  assert.equal(serializeCaptionPlain(doc), "hello\nplain");
});

test("parseMarkup supports italic, big, and small syntax", () => {
  assert.deepEqual(parseMarkup("*italic*"), [{ text: "italic", style: { italic: true } }]);
  assert.deepEqual(parseMarkup("_italic_"), [{ text: "italic", style: { italic: true } }]);
  assert.deepEqual(parseMarkup("^big^"), [{ text: "big", style: { scale: 1.2 } }]);
  assert.deepEqual(parseMarkup(",small,"), [{ text: "small", style: { scale: 0.85 } }]);
});

test("unclosed marker stays literal while typing", () => {
  const segs = parseMarkup("~hello");
  assert.deepEqual(segs, [{ text: "~hello" }]);
});

test("unclosed marker becomes plain text on finalize", () => {
  const segs = finalizeBox("~hello");
  assert.deepEqual(segs, [{ text: "~hello" }]);
});

test("unclosed marker mid-string finalizes remainder as plain", () => {
  const segs = finalizeBox("before~after");
  assert.deepEqual(segs, [{ text: "before~after" }]);
});

test("escaped markers render as literals", () => {
  assert.deepEqual(parseMarkup("\\~not slant\\~"), [{ text: "~not slant~" }]);
  assert.deepEqual(parseMarkup("\\*not italic\\*"), [{ text: "*not italic*" }]);
  assert.deepEqual(parseMarkup("\\\\backslash"), [{ text: "\\backslash" }]);
});

test("no nesting: inner markers are literal", () => {
  const segs = parseMarkup("~outer *inner*~");
  assert.equal(segs.length, 1);
  assert.equal(segs[0].text, "outer *inner*");
  assert.equal(segs[0].style?.slant, -12);
});

test("mixed plain and styled segments", () => {
  const segs = finalizeBox("plain ~slant~ more");
  assert.equal(segs.length, 3);
  assert.deepEqual(segs[0], { text: "plain " });
  assert.equal(segs[1].text, "slant");
  assert.equal(segs[1].style?.slant, -12);
  assert.deepEqual(segs[2], { text: " more" });
});

test("resolveSegmentFill prefers segment override over box default", () => {
  const seg = { text: "x", style: { fill: "black" } };
  assert.equal(resolveSegmentFill(seg, { fill: "white" }), "black");
});

test("resolveSegmentFill defaults to white", () => {
  assert.equal(resolveSegmentFill({ text: "x" }), "white");
  assert.equal(resolveSegmentFill({ text: "x" }, undefined), "white");
});

test("strokeStylesForFill inverts outline for black fill", () => {
  const styles = strokeStylesForFill("black");
  assert.equal(styles.color, "#000");
  assert.match(String(styles.textShadow), /#fff/i);
  assert.equal(styles.WebkitTextStroke, undefined);
});

test("strokeStylesForFill export mode uses text-shadow only", () => {
  const styles = strokeStylesForFill("white", "export");
  assert.equal(styles.color, "#fff");
  assert.equal(styles.WebkitTextStroke, undefined);
  assert.match(String(styles.textShadow), /#000/i);
});

test("fillBlack applies to selection range only", () => {
  const segments = [{ text: "hello world" }];
  const next = applyToolbarToSegments(segments, { start: 0, end: 5 }, "fillBlack");
  assert.equal(next.length, 2);
  assert.equal(next[0].text, "hello");
  assert.equal(next[0].style?.fill, "black");
  assert.equal(next[1].text, " world");
  assert.equal(next[1].style?.fill, undefined);
});

test("snapshotsEqual ignores box.segments text changes", () => {
  const boxes = [
    {
      id: "t0",
      kind: "template",
      templateIndex: 0,
      segments: [{ text: "a" }],
      layout: { x: 0.1, y: 0.05, w: 0.8, h: 0.2 },
    },
  ];
  const a = takeSnapshot(boxes, ["a"], [null]);
  const boxes2 = [{ ...boxes[0], segments: [{ text: "changed" }] }];
  const b = takeSnapshot(boxes2, ["a"], [null]);
  assert.equal(snapshotsEqual(a, b), true);
});

test("snapshotsEqual detects style.fill change", () => {
  const base = {
    id: "t0",
    kind: "template",
    templateIndex: 0,
    segments: [{ text: "a" }],
    layout: { x: 0.1, y: 0.05, w: 0.8, h: 0.2 },
  };
  const a = takeSnapshot([base], ["a"], [null]);
  const b = takeSnapshot([{ ...base, style: { fill: "black" } }], ["a"], [null]);
  assert.equal(snapshotsEqual(a, b), false);
});

test("snapshotsEqual detects style.pill change", () => {
  const base = {
    id: "t0",
    kind: "template",
    templateIndex: 0,
    segments: [{ text: "a" }],
    layout: { x: 0.1, y: 0.05, w: 0.8, h: 0.2 },
  };
  const a = takeSnapshot([base], ["a"], [null]);
  const b = takeSnapshot([{ ...base, style: { pill: true } }], ["a"], [null]);
  assert.equal(snapshotsEqual(a, b), false);
});

test("snapshotsEqual detects z change", () => {
  const base = {
    id: "t0",
    kind: "template",
    templateIndex: 0,
    segments: [{ text: "a" }],
    layout: { x: 0.1, y: 0.05, w: 0.8, h: 0.2 },
  };
  const a = takeSnapshot([base], ["a"], [null]);
  const b = takeSnapshot([{ ...base, z: 9 }], ["a"], [null]);
  assert.equal(snapshotsEqual(a, b), false);
});

test("snapshotsEqual detects segment override fill change", () => {
  const boxes = [
    {
      id: "t0",
      kind: "template",
      templateIndex: 0,
      segments: [{ text: "" }],
      layout: { x: 0.1, y: 0.05, w: 0.8, h: 0.2 },
    },
  ];
  const a = takeSnapshot(boxes, ["hi"], [null]);
  const b = takeSnapshot(boxes, ["hi"], [[{ text: "hi", style: { fill: "black" } }]]);
  assert.equal(snapshotsEqual(a, b), false);
});

test("finalizeCaptionDocumentV3 preserves box.style on submit", () => {
  const boxes = [
    {
      id: "t0",
      kind: "template",
      templateIndex: 0,
      segments: [{ text: "" }],
      layout: { x: 0.1, y: 0.05, w: 0.8, h: 0.2 },
      style: { fill: "black", pill: true },
    },
  ];
  const doc = finalizeCaptionDocumentV3({
    boxes,
    layoutRevision: 1,
    rawTexts: ["hi"],
  });
  assert.equal(doc.boxes[0].style?.fill, "black");
  assert.equal(doc.boxes[0].style?.pill, true);
});
