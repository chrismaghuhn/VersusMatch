"use client";

type RerollConfirmDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
};

export function RerollConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
}: RerollConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reroll-confirm-title"
        aria-describedby="reroll-confirm-body"
        className="relative mx-auto w-full max-w-md border-2 border-white/20 bg-black p-6 shadow-[6px_6px_0_#CCFF00]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="reroll-confirm-title"
          className="text-white"
          style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1.1 }}
        >
          {title}
        </h2>
        <p
          id="reroll-confirm-body"
          className="mt-3 text-white/65"
          style={{ fontSize: 14, lineHeight: 1.55 }}
        >
          {body}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-[#FF2D87] py-3 text-white transition hover:bg-[#CCFF00] hover:text-black"
            style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.14em" }}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-white/25 py-3 text-white/70 transition hover:border-[#00E1FF] hover:text-[#00E1FF]"
            style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.14em" }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
