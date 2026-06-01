"use client";

import { useCallback, useRef } from "react";
import { clampLayout } from "@/lib/party/caption-rich/layout";
import type { BoxLayout, CaptionBox } from "@/lib/party/caption-rich/types";

type MemeCanvasOverlayProps = {
  boxes: CaptionBox[];
  activeBoxId: string | null;
  mobile?: boolean;
  onMoveBox: (boxId: string, layout: BoxLayout) => void;
  onResizeBox: (boxId: string, layout: BoxLayout) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
};

type DragMode = "move" | "resize";

type DragState = {
  boxId: string;
  mode: DragMode;
  startPointerX: number;
  startPointerY: number;
  startLayout: BoxLayout;
};

function pointerToNormalized(
  clientX: number,
  clientY: number,
  rect: DOMRect
): { x: number; y: number } {
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  };
}

export function MemeCanvasOverlay({
  boxes,
  activeBoxId,
  mobile = false,
  onMoveBox,
  onResizeBox,
  onInteractionStart,
  onInteractionEnd,
}: MemeCanvasOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container) return;

      const rect = container.getBoundingClientRect();
      const pointer = pointerToNormalized(event.clientX, event.clientY, rect);
      const dx = pointer.x - drag.startPointerX;
      const dy = pointer.y - drag.startPointerY;

      if (drag.mode === "move") {
        onMoveBox(
          drag.boxId,
          clampLayout({
            ...drag.startLayout,
            x: drag.startLayout.x + dx,
            y: drag.startLayout.y + dy,
          })
        );
      } else {
        onResizeBox(
          drag.boxId,
          clampLayout({
            ...drag.startLayout,
            w: drag.startLayout.w + dx,
            h: drag.startLayout.h + dy,
          })
        );
      }
    },
    [onMoveBox, onResizeBox]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerUp);
    onInteractionEnd();
  }, [handlePointerMove, onInteractionEnd]);

  const startDrag = useCallback(
    (event: React.PointerEvent, boxId: string, mode: DragMode, layout: BoxLayout) => {
      event.preventDefault();
      event.stopPropagation();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const pointer = pointerToNormalized(event.clientX, event.clientY, rect);

      dragRef.current = {
        boxId,
        mode,
        startPointerX: pointer.x,
        startPointerY: pointer.y,
        startLayout: layout,
      };

      onInteractionStart();
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [handlePointerMove, handlePointerUp, onInteractionStart]
  );

  const activeBox = activeBoxId ? boxes.find((b) => b.id === activeBoxId) : null;
  if (!activeBox) return null;

  const handleSize = mobile ? 44 : 16;

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-20">
      <div
        className="pointer-events-auto absolute border-2 border-dashed border-[#CCFF00]"
        style={{
          left: `${activeBox.layout.x * 100}%`,
          top: `${activeBox.layout.y * 100}%`,
          width: `${activeBox.layout.w * 100}%`,
          height: `${activeBox.layout.h * 100}%`,
          touchAction: "none",
        }}
        onPointerDown={(event) =>
          startDrag(event, activeBox.id, "move", activeBox.layout)
        }
      >
        <div
          className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-sm border-2 border-[#CCFF00] bg-black/80"
          style={{
            width: handleSize,
            height: handleSize,
            touchAction: "none",
          }}
          onPointerDown={(event) =>
            startDrag(event, activeBox.id, "resize", activeBox.layout)
          }
        />
      </div>
    </div>
  );
}
