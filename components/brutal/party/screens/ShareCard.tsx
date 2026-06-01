"use client";

import { Twitter, Copy, Check, Download } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Meta, Shell } from "@/components/brutal/party/shared/Shell";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import { Avatar } from "@/components/brutal/party/shared/Avatar";
import {
  buildShareCardData,
  buildShareTweetText,
  type ShareCardData,
} from "@/lib/party/share-card-data";
import { captureShareCardPng } from "@/lib/party/share-card-png";
import type { PartySnapshot } from "@/lib/party/types";
import { getAppUrl } from "@/lib/utils";

const MOCK_DATA: ShareCardData = {
  roomCode: "FIGHT42",
  roundCount: 7,
  gameWinners: [
    {
      handle: "PettyQueen",
      score: 1840,
      isYou: false,
      avatarId: "crown",
      avatarColor: "#FF2D87",
    },
  ],
  roundWinner: {
    handle: "PettyQueen",
    caption: "MY PRODUCTIVITY APP|OPENING TWITTER 47 TIMES",
    voteCount: 4,
    avatarId: "crown",
    avatarColor: "#FF2D87",
    template: null,
  },
  template: null,
};

type ShareCardProps = {
  snapshot?: PartySnapshot;
  /** Compact layout for embedding under finished leaderboard */
  embedded?: boolean;
  /** Hide PNG download (e.g. desktop finished arena layout) */
  showPngDownload?: boolean;
};

export function ShareCard({ snapshot, embedded = false, showPngDownload = true }: ShareCardProps) {
  const data = useMemo(
    () => (snapshot ? buildShareCardData(snapshot) : MOCK_DATA),
    [snapshot]
  );
  const joinUrl = getAppUrl(`/party/join/${data.roomCode}`);
  const tweetText = buildShareTweetText(data, joinUrl);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTweet, setCopiedTweet] = useState(false);
  const [pngState, setPngState] = useState<"idle" | "generating" | "done" | "error">("idle");
  const previewRef = useRef<HTMLDivElement>(null);

  const primaryWinner = data.gameWinners[0];
  const headline =
    data.gameWinners.length === 1 ? (
      <>
        <span className="italic text-[#CCFF00]">@{primaryWinner!.handle}</span> wins.
      </>
    ) : data.gameWinners.length > 1 ? (
      <>
        <span className="italic text-[#CCFF00]">{data.gameWinners.length}-way tie</span>
      </>
    ) : (
      <>Game over in room <span className="text-[#FF2D87]">{data.roomCode}</span>.</>
    );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function copyTweet() {
    try {
      await navigator.clipboard.writeText(tweetText);
      setCopiedTweet(true);
      setTimeout(() => setCopiedTweet(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function downloadPng() {
    if (!previewRef.current || pngState === "generating") {
      return;
    }
    setPngState("generating");
    try {
      await captureShareCardPng(previewRef.current, data.roomCode);
      setPngState("done");
      setTimeout(() => setPngState("idle"), 1500);
    } catch {
      setPngState("error");
      setTimeout(() => setPngState("idle"), 2500);
    }
  }

  const inner = (
    <div className={embedded ? "mt-10 border-t border-white/10 pt-10" : ""}>
      {!embedded ? (
        <div className="mb-6">
          <Meta color="#CCFF00">━━ POST-GAME SHARE</Meta>
          <h2
            className="mt-2 text-white"
            style={{
              fontWeight: 900,
              fontSize: "clamp(28px, 5vw, 48px)",
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
            }}
          >
            Brag <span className="italic text-[#CCFF00]">responsibly</span>.
          </h2>
        </div>
      ) : (
        <div className="mb-4">
          <Meta color="#CCFF00">SHARE</Meta>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Meta>PREVIEW</Meta>
          <div
            ref={previewRef}
            data-share-card-preview=""
            className="relative mt-2 overflow-hidden border border-white/10 bg-[#0a0a0a]"
            style={{ aspectRatio: embedded ? "16/10" : "1200/675" }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 20% 20%, rgba(204,255,0,0.12), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,45,135,0.12), transparent 50%)",
              }}
            />

            <div className="absolute inset-0 flex flex-col p-4 sm:flex-row sm:p-6">
              <div className="flex flex-1 items-center justify-center sm:pr-4">
                <div className="w-full max-w-[200px] sm:max-w-[240px]">
                  {data.template || data.roundWinner?.caption ? (
                    <PartyTemplateFrame
                      caption={data.roundWinner?.caption}
                      captionRich={data.roundWinner?.captionRich}
                      imageUrl={data.template?.imageUrl}
                      textBoxes={data.template?.textBoxes}
                      mini={embedded}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center border border-white/20 bg-black text-white/40" style={{ fontSize: 11, fontWeight: 800 }}>
                      MEME
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-1 flex-col justify-between sm:mt-0">
                <div>
                  <div
                    className="inline-flex items-center gap-2 border border-[#CCFF00] bg-[#CCFF00]/15 px-2 py-1 text-[#CCFF00]"
                    style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.2em" }}
                  >
                    {data.roundWinner ? "★ ROUND CHAMPION" : "★ FINAL"}
                  </div>
                  <div
                    className="mt-3 text-white"
                    style={{ fontWeight: 900, fontSize: embedded ? 20 : 28, letterSpacing: "-0.03em", lineHeight: 1 }}
                  >
                    {headline}
                  </div>
                  {data.roundWinner ? (
                    <div className="mt-2 text-white/60" style={{ fontSize: 12 }}>
                      {data.roundWinner.voteCount} votes · {data.roundCount} rounds · @{data.roundWinner.handle}
                    </div>
                  ) : (
                    <div className="mt-2 text-white/60" style={{ fontSize: 12 }}>
                      {data.roundCount} rounds · room {data.roomCode}
                    </div>
                  )}
                </div>

                {primaryWinner ? (
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                    <div className="flex items-center gap-2">
                      <div className="border-2 border-[#FF2D87]">
                        <Avatar
                          id={primaryWinner.avatarId}
                          color={primaryWinner.avatarColor}
                          size={embedded ? 36 : 44}
                        />
                      </div>
                      <div>
                        <div className="text-white" style={{ fontWeight: 900, fontSize: 14 }}>
                          @{primaryWinner.handle}
                        </div>
                        <div className="text-white/40" style={{ fontSize: 10 }}>
                          memefight.lol
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-[#CCFF00]"
                        style={{ fontFamily: "ui-monospace, monospace", fontWeight: 900, fontSize: 18 }}
                      >
                        {primaryWinner.score}
                      </div>
                      <div className="text-white/40" style={{ fontSize: 9, letterSpacing: "0.15em" }}>
                        FINAL
                      </div>
                    </div>
                  </div>
                ) : data.roundWinner ? (
                  <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
                    <Avatar
                      id={data.roundWinner.avatarId}
                      color={data.roundWinner.avatarColor}
                      size={36}
                    />
                    <span className="text-white" style={{ fontWeight: 800, fontSize: 13 }}>
                      @{data.roundWinner.handle}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div
              className="absolute bottom-2 right-2 text-white/30"
              style={{ fontSize: 9, letterSpacing: "0.2em", fontWeight: 800 }}
            >
              MEMEFIGHT.LOL
            </div>
          </div>
        </div>

        <div className="border border-white/10 bg-black p-4">
          <Meta>SUGGESTED TWEET</Meta>
          <textarea
            readOnly
            value={tweetText}
            className="mt-2 h-24 w-full resize-none border border-white/10 bg-[#0a0a0a] p-3 text-white outline-none"
            style={{ fontSize: 12, lineHeight: 1.5 }}
          />
          <div className="mt-2 text-white/40" style={{ fontSize: 11 }}>
            {tweetText.length} / 280
          </div>
        </div>

        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 bg-[#1DA1F2] py-3 text-white hover:bg-white hover:text-black"
          style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.18em" }}
        >
          <Twitter className="h-4 w-4 fill-current" /> POST TO TWITTER
        </a>

        <div className={"grid grid-cols-1 gap-2 " + (showPngDownload ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          {showPngDownload ? (
            <button
              type="button"
              onClick={() => void downloadPng()}
              disabled={pngState === "generating"}
              className="flex items-center justify-center gap-2 border border-white/20 py-3 text-white hover:border-[#CCFF00] hover:text-[#CCFF00] disabled:opacity-50"
              style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
            >
              {pngState === "generating" ? (
                <>GENERATING…</>
              ) : pngState === "done" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#CCFF00]" /> SAVED
                </>
              ) : pngState === "error" ? (
                <>PNG FAILED</>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" /> DOWNLOAD PNG
                </>
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void copyTweet()}
            className="flex items-center justify-center gap-2 border border-white/20 py-3 text-white hover:border-[#CCFF00] hover:text-[#CCFF00]"
            style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
          >
            {copiedTweet ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#CCFF00]" /> COPIED
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> COPY TWEET
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex items-center justify-center gap-2 border border-white/20 py-3 text-white hover:border-[#CCFF00] hover:text-[#CCFF00]"
            style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#CCFF00]" /> COPIED
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> COPY LINK
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return inner;
  }

  return (
    <Shell>
      <div className="mx-auto max-w-lg px-6 py-12">{inner}</div>
    </Shell>
  );
}
