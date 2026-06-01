import assert from "node:assert/strict";
import { test } from "node:test";

import {
  finalizeCaptionDocument,
  structuralDocumentFromFieldTexts,
} from "../lib/party/caption-rich/document.ts";
import { captionForFrame } from "../lib/party/caption-rich/legacy-read.ts";
import { finalizeBox, parseMarkup } from "../lib/party/caption-rich/parse-markup.ts";
import {
  plainTextLength,
  serializeCaptionPlain,
} from "../lib/party/caption-rich/plain-text.ts";

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
