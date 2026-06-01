import assert from "node:assert/strict";
import { test } from "node:test";

import { structuralDocumentFromFieldTexts } from "../lib/party/caption-rich/document.ts";
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
