import type { TextBox } from "@/lib/party/types";

export function limitTextBoxes(boxes: TextBox[], max: number = 2): TextBox[] {
  return boxes.slice(0, max);
}
