import type { CaptionDocument } from "@/lib/party/caption-rich/types";

export type CaptionFrameSource =
  | { rich: CaptionDocument }
  | { legacy: string };

/** Pick renderer input: rich v2/v3 document or legacy pipe caption string. */
export function captionForFrame(sub: {
  caption: string;
  captionRich?: CaptionDocument | null;
}): CaptionFrameSource {
  if (sub.captionRich != null) {
    return { rich: sub.captionRich };
  }
  return { legacy: sub.caption };
}
