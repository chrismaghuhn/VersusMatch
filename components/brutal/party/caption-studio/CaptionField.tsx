"use client";

import { useRef } from "react";
import { CaptionToolbar } from "@/components/brutal/party/caption-studio/CaptionToolbar";
import { PARTY_COPY } from "@/lib/party/copy";
import type { TextSelection, ToolbarAction } from "@/lib/party/caption-rich/segment-toolbar";

type CaptionFieldProps = {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  mobile?: boolean;
  isLastField?: boolean;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onToolbarAction: (action: ToolbarAction, selection: TextSelection | null) => void;
};

export function CaptionField({
  id,
  label,
  value,
  disabled = false,
  placeholder,
  mobile = false,
  isLastField = false,
  onChange,
  onSubmit,
  onFocus,
  onBlur,
  onToolbarAction,
}: CaptionFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function readSelection(): TextSelection | null {
    const el = textareaRef.current;
    if (!el) return null;
    const { selectionStart, selectionEnd } = el;
    if (selectionStart === selectionEnd) return null;
    return { start: selectionStart, end: selectionEnd };
  }

  function handleToolbar(action: ToolbarAction) {
    onToolbarAction(action, readSelection());
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="text-white/40"
        style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}
      >
        {label.toUpperCase()}
      </label>
      <div className="mt-2 space-y-2">
        <CaptionToolbar disabled={disabled} mobile={mobile} onAction={handleToolbar} />
        <textarea
          ref={textareaRef}
          id={id}
          rows={2}
          value={value}
          disabled={disabled}
          placeholder={placeholder ?? label}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && isLastField) {
              e.preventDefault();
              onSubmit?.();
            }
          }}
          className={
            mobile
              ? "w-full resize-none border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-white outline-none focus:border-[#CCFF00] disabled:opacity-50"
              : "w-full resize-none border-2 border-white/10 bg-[#0a0a0a] px-4 py-4 text-white outline-none transition focus:border-[#CCFF00] disabled:opacity-50"
          }
          style={
            mobile
              ? { fontSize: 13, fontFamily: "ui-monospace, monospace" }
              : {
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }
          }
        />
        <p className="text-white/30" style={{ fontSize: 10, fontWeight: 600 }}>
          {PARTY_COPY.captionSyntaxHint}
        </p>
      </div>
    </div>
  );
}
