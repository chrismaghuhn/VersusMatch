"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { MemeFrame } from "@/components/brutal/party/shared/MemeFrame";
import { Avatar } from "@/components/brutal/party/shared/Avatar";
import { Meta } from "@/components/brutal/party/shared/Shell";
import { PARTY_COPY, PARTY_TUTORIAL_SLIDES } from "@/lib/party/copy";

type PartyTutorialOverlayProps = {
  onDismiss: () => void;
};

function TutorialVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="border-2 border-[#CCFF00] bg-black p-6 text-center">
          <div className="text-white/40" style={{ fontSize: 10, letterSpacing: "0.2em", fontWeight: 800 }}>
            ROOM CODE
          </div>
          <div className="mt-2 flex gap-1">
            {"ABC123".split("").map((c, i) => (
              <span
                key={i}
                className="flex h-12 w-9 items-center justify-center border border-[#CCFF00] bg-[#CCFF00]/10 text-[#CCFF00]"
                style={{ fontFamily: "ui-monospace, monospace", fontWeight: 900, fontSize: 22 }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="flex h-full flex-col gap-2">
        <div className="flex-1">
          <MemeFrame template="drake" caption="MY PRODUCTIVITY APP|OPENING TWITTER 47 TIMES" />
        </div>
        <input
          defaultValue="HAVING A LIFE"
          className="border border-[#FF2D87] bg-black px-3 py-2 text-white"
          style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
          readOnly
        />
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="grid h-full grid-cols-2 gap-2">
        <div className="relative border border-white/10">
          <MemeFrame template="drake" caption="ANON|ENTRY" mini />
          <div
            className="absolute inset-x-0 bottom-0 border-t-2 border-[#CCFF00] bg-[#CCFF00] py-1 text-center text-black"
            style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.15em" }}
          >
            ♥ VOTED
          </div>
        </div>
        <div className="border border-white/10 opacity-50">
          <MemeFrame template="drake" caption="OTHER|ENTRY" mini />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-[#FFB800]/20 to-transparent p-6">
      <div className="border-4 border-[#FFB800]">
        <Avatar id="crown" color="#FFB800" size={88} />
      </div>
      <div className="mt-4 text-[#FFB800]" style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.2em" }}>
        ★ CHAMPION
      </div>
      <div className="mt-1 text-white" style={{ fontWeight: 900, fontSize: 24 }}>
        PettyQueen
      </div>
      <div className="mt-1 text-white/50" style={{ fontFamily: "ui-monospace, monospace", fontSize: 14 }}>
        1.840 PTS
      </div>
    </div>
  );
}

export function PartyTutorialOverlay({ onDismiss }: PartyTutorialOverlayProps) {
  const [i, setI] = useState(0);
  const s = PARTY_TUTORIAL_SLIDES[i];
  const last = i === PARTY_TUTORIAL_SLIDES.length - 1;

  function handleNext() {
    if (last) {
      onDismiss();
      return;
    }
    setI(i + 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="relative mx-auto w-full max-w-[900px] border border-white/10 bg-black">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <Meta color={s.color}>
            {PARTY_COPY.tutorialProgress(i + 1, PARTY_TUTORIAL_SLIDES.length)}
          </Meta>
          <button
            type="button"
            onClick={onDismiss}
            className="text-white/40 hover:text-white"
            style={{ fontSize: 11, letterSpacing: "0.15em", fontWeight: 700 }}
          >
            {PARTY_COPY.tutorialSkip}
          </button>
        </div>

        <div className="mb-0 flex gap-1 px-4 pt-3">
          {PARTY_TUTORIAL_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setI(idx)}
              className={
                "h-1 flex-1 transition " +
                (idx === i ? "" : idx < i ? "bg-white/40" : "bg-white/10 hover:bg-white/20")
              }
              style={idx === i ? { background: s.color } : {}}
            />
          ))}
        </div>

        <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col justify-between border-b border-white/10 p-6 md:border-b-0 md:border-r">
            <div>
              <div
                style={{
                  color: s.color,
                  fontWeight: 900,
                  fontSize: 72,
                  letterSpacing: "-0.06em",
                  lineHeight: 0.9,
                }}
              >
                {s.num}
              </div>
              <div
                className="mt-1 text-white/40"
                style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.2em" }}
              >
                {s.eyebrow}
              </div>
              <h2
                className="mt-4 text-white"
                style={{ fontWeight: 900, fontSize: 36, letterSpacing: "-0.04em", lineHeight: 0.95 }}
              >
                {s.title}
              </h2>
              <p className="mt-3 text-white/60" style={{ fontSize: 14, lineHeight: 1.55 }}>
                {s.body}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setI(Math.max(0, i - 1))}
                disabled={i === 0}
                className="flex items-center gap-2 text-white/50 hover:text-white disabled:opacity-30"
                style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.15em" }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {PARTY_COPY.tutorialBack}
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-3 text-black hover:bg-white"
                style={{ background: s.color, fontSize: 12, fontWeight: 900, letterSpacing: "0.18em" }}
              >
                {last ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> {PARTY_COPY.tutorialDone}
                  </>
                ) : (
                  <>
                    {PARTY_COPY.tutorialNext} <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="relative bg-[#0a0a0a] p-6">
            <div className="h-full min-h-[200px]">
              <TutorialVisual index={i} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
