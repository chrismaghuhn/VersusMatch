import assert from "node:assert/strict";
import { test } from "node:test";

import {
  clampLayout,
  computeCardFit,
  defaultTemplateBoxes,
  nextCustomBox,
} from "../lib/party/caption-rich/layout.ts";
import { validateCaptionDocumentV3 } from "../lib/party/caption-rich/validate-document.ts";
import { boxPlainText } from "../lib/party/caption-rich/plain-text.ts";

const TEMPLATE_BOXES = [
  { id: "top", x: 0.1, y: 0.05, w: 0.8, h: 0.2, align: "center", maxLines: 3 },
  { id: "bot", x: 0.1, y: 0.75, w: 0.8, h: 0.2, align: "center", maxLines: 3 },
];

function makeV3Doc(overrides = {}) {
  const boxes = defaultTemplateBoxes(TEMPLATE_BOXES);
  boxes[0].segments = [{ text: "hello" }];
  return {
    v: 3,
    layoutRevision: 1,
    rawTexts: ["hello", ""],
    boxes,
    ...overrides,
  };
}

test("clampLayout rejects overflow (x+w>1 clamped)", () => {
  const clamped = clampLayout({ x: 0.9, y: 0, w: 0.5, h: 0.1 });
  assert.ok(clamped.x + clamped.w <= 1.001);
  assert.equal(clamped.x, 0.5);
  assert.equal(clamped.w, 0.5);
});

test("defaultTemplateBoxes count matches template", () => {
  const boxes = defaultTemplateBoxes(TEMPLATE_BOXES);
  assert.equal(boxes.length, TEMPLATE_BOXES.length);
  assert.equal(boxes[0].kind, "template");
  assert.equal(boxes[0].templateIndex, 0);
  assert.equal(boxes[1].templateIndex, 1);
});

test("computeCardFit scales wide union down (scale < 1)", () => {
  const boxes = defaultTemplateBoxes(TEMPLATE_BOXES);
  boxes[0].segments = [{ text: "wide" }];
  boxes[0].layout = { x: 0, y: 0, w: 0.9, h: 0.5 };
  const fit = computeCardFit(boxes);
  assert.ok(fit.scale < 1);
});

test("validateCaptionDocumentV3 rejects wrong layoutRevision", () => {
  const doc = makeV3Doc({ layoutRevision: 2 });
  const result = validateCaptionDocumentV3(doc, TEMPLATE_BOXES, 1);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "stale_revision");
});

test("nextCustomBox rejects 3rd custom box", () => {
  const boxes = defaultTemplateBoxes(TEMPLATE_BOXES);
  boxes.push(
    {
      id: "custom-1",
      kind: "custom",
      segments: [{ text: "" }],
      layout: { x: 0.25, y: 0.4, w: 0.5, h: 0.12, align: "center" },
    },
    {
      id: "custom-2",
      kind: "custom",
      segments: [{ text: "" }],
      layout: { x: 0.25, y: 0.5, w: 0.5, h: 0.12, align: "center" },
    }
  );
  assert.equal(nextCustomBox(boxes), null);
});

test("validateCaptionDocumentV3 rejects >2 custom boxes", () => {
  const doc = makeV3Doc();
  doc.boxes.push(
    {
      id: "c1",
      kind: "custom",
      segments: [{ text: "a" }],
      layout: { x: 0.1, y: 0.3, w: 0.2, h: 0.1 },
    },
    {
      id: "c2",
      kind: "custom",
      segments: [{ text: "b" }],
      layout: { x: 0.1, y: 0.4, w: 0.2, h: 0.1 },
    },
    {
      id: "c3",
      kind: "custom",
      segments: [{ text: "c" }],
      layout: { x: 0.1, y: 0.5, w: 0.2, h: 0.1 },
    }
  );
  const result = validateCaptionDocumentV3(doc, TEMPLATE_BOXES, 1);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "invalid_caption");
});

test("boxPlainText joins segment texts", () => {
  assert.equal(boxPlainText([{ text: "hel" }, { text: "lo" }]), "hello");
});

test("validateCaptionDocumentV3 rejects invalid style.fill", () => {
  const doc = makeV3Doc();
  doc.boxes[0].style = { fill: "red" };
  const result = validateCaptionDocumentV3(doc, TEMPLATE_BOXES, 1);
  assert.equal(result.ok, false);
});

test("validateCaptionDocumentV3 accepts black fill and pill", () => {
  const doc = makeV3Doc();
  doc.boxes[0].style = { fill: "black", pill: true };
  const result = validateCaptionDocumentV3(doc, TEMPLATE_BOXES, 1);
  assert.equal(result.ok, true);
});
