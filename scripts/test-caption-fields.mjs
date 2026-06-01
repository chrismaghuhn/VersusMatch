import assert from "node:assert/strict";
import { test } from "node:test";

const CAPTION_MAX_LENGTH = 120;
const MULTI_FIELD_SEP = "\x1e";

function splitCaptionToFields(caption) {
  const pipeIndex = caption.indexOf("|");
  if (pipeIndex === -1) return [caption, ""];
  return [caption.slice(0, pipeIndex), caption.slice(pipeIndex + 1)];
}

function buildCaptionFromFields(top, bottom) {
  if (!top && !bottom) return "";
  if (!bottom) return top.slice(0, CAPTION_MAX_LENGTH);
  if (!top) return bottom.slice(0, CAPTION_MAX_LENGTH);
  return `${top}|${bottom}`.slice(0, CAPTION_MAX_LENGTH);
}

function buildCaptionFromFieldsForSubmit(top, bottom) {
  return buildCaptionFromFields(top.trim(), bottom.trim());
}

function splitCaptionToFieldTexts(caption, boxCount) {
  if (boxCount <= 1) return [caption];
  if (boxCount === 2) return splitCaptionToFields(caption);
  if (caption.includes(MULTI_FIELD_SEP)) {
    const parts = caption.split(MULTI_FIELD_SEP);
    return Array.from({ length: boxCount }, (_, i) => parts[i] ?? "");
  }
  return [caption, ...Array.from({ length: boxCount - 1 }, () => "")];
}

function buildCaptionFromFieldTexts(texts) {
  if (texts.length === 0) return "";
  if (texts.length === 1) return texts[0].slice(0, CAPTION_MAX_LENGTH);
  if (texts.length === 2) return buildCaptionFromFields(texts[0] ?? "", texts[1] ?? "");
  return texts.join(MULTI_FIELD_SEP);
}

function captionFieldTextsTotalLength(texts) {
  return texts.reduce((sum, t) => sum + t.length, 0);
}

test("buildCaptionFromFields preserves leading space while editing", () => {
  assert.equal(buildCaptionFromFields(" hello", "world"), " hello|world");
});

test("buildCaptionFromFieldsForSubmit trims each field on submit", () => {
  assert.equal(buildCaptionFromFieldsForSubmit(" hello ", " world "), "hello|world");
});

test("splitCaptionToFieldTexts uses record separator for 4 boxes", () => {
  const encoded = ["a", "b", "c", "d"].join(MULTI_FIELD_SEP);
  assert.deepEqual(splitCaptionToFieldTexts(encoded, 4), ["a", "b", "c", "d"]);
});

test("captionFieldTextsTotalLength counts plain chars only", () => {
  assert.equal(captionFieldTextsTotalLength(["hello", "world"]), 10);
});

test("buildCaptionFromFieldTexts round-trips 3 fields", () => {
  const texts = ["one", "two", "three"];
  const encoded = buildCaptionFromFieldTexts(texts);
  assert.deepEqual(splitCaptionToFieldTexts(encoded, 3), texts);
});
