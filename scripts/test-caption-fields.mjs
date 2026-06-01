import assert from "node:assert/strict";
import { test } from "node:test";

const CAPTION_MAX_LENGTH = 120;

function buildCaptionFromFields(top, bottom) {
  if (!top && !bottom) return "";
  if (!bottom) return top.slice(0, CAPTION_MAX_LENGTH);
  if (!top) return bottom.slice(0, CAPTION_MAX_LENGTH);
  return `${top}|${bottom}`.slice(0, CAPTION_MAX_LENGTH);
}

function buildCaptionFromFieldsForSubmit(top, bottom) {
  return buildCaptionFromFields(top.trim(), bottom.trim());
}

test("buildCaptionFromFields preserves leading space while editing", () => {
  assert.equal(buildCaptionFromFields(" hello", "world"), " hello|world");
});

test("buildCaptionFromFieldsForSubmit trims each field on submit", () => {
  assert.equal(buildCaptionFromFieldsForSubmit(" hello ", " world "), "hello|world");
});
