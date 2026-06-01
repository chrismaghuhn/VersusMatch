import { toPng } from "html-to-image";

const EXPORT_WIDTH = 1200;
const EXPORT_HEIGHT = 675;

async function preloadImagesForCapture(root: HTMLElement): Promise<Array<() => void>> {
  const restore: Array<() => void> = [];
  const imgs = root.querySelectorAll("img");

  for (const img of imgs) {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("blob:") || src.startsWith("data:")) {
      continue;
    }

    try {
      const response = await fetch(src, { mode: "cors", credentials: "omit" });
      if (!response.ok) {
        continue;
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const originalSrc = img.src;
      img.crossOrigin = "anonymous";
      img.src = blobUrl;
      await img.decode();
      restore.push(() => {
        img.src = originalSrc;
        URL.revokeObjectURL(blobUrl);
      });
    } catch {
      /* keep original src — capture may still work for same-origin assets */
    }
  }

  return restore;
}

export async function captureShareCardPng(
  element: HTMLElement,
  roomCode: string
): Promise<void> {
  const restore = await preloadImagesForCapture(element);

  try {
    const dataUrl = await toPng(element, {
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
      pixelRatio: 1,
      cacheBust: true,
      style: {
        width: `${EXPORT_WIDTH}px`,
        height: `${EXPORT_HEIGHT}px`,
      },
    });

    const link = document.createElement("a");
    link.download = `memefight-party-${roomCode}.png`;
    link.href = dataUrl;
    link.click();
  } finally {
    restore.forEach((fn) => fn());
  }
}
