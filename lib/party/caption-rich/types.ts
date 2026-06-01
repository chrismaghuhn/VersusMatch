export type CaptionSegmentStyle = {
  caps?: boolean;
  slant?: number;
  scale?: number;
  italic?: boolean;
};

export type CaptionSegment = {
  text: string;
  style?: CaptionSegmentStyle;
};

export type CaptionDocument = {
  v: 2;
  boxes: CaptionSegment[][];
};
