export type BoxVisualStyle = {
  fill?: "white" | "black";
  pill?: boolean;
};

export type CaptionSegmentStyle = {
  caps?: boolean;
  slant?: number;
  scale?: number;
  italic?: boolean;
  fill?: "white" | "black";
};

export type CaptionSegment = {
  text: string;
  style?: CaptionSegmentStyle;
};

export type BoxLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  align?: "left" | "center" | "right";
};

export type CaptionBox = {
  id: string;
  kind: "template" | "custom";
  templateIndex?: number;
  segments: CaptionSegment[];
  layout: BoxLayout;
  style?: BoxVisualStyle;
};

export type CaptionDocumentV2 = { v: 2; boxes: CaptionSegment[][] };
export type CaptionDocumentV3 = {
  v: 3;
  layoutRevision: number;
  /** Per-box raw field text — required for draft sync/restore; submit uses finalized segments in boxes */
  rawTexts: string[];
  boxes: CaptionBox[];
};
export type CaptionDocument = CaptionDocumentV2 | CaptionDocumentV3;

export function isCaptionDocumentV3(doc: CaptionDocument): doc is CaptionDocumentV3 {
  return doc.v === 3;
}
