"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "@/components/battle-vote-ui";
import { buildBattleShareText } from "@/lib/share-links";

type CreateShareBannerProps = {
  title: string;
  optionA: string;
  optionB: string;
  shareUrl: string;
};

export function CreateShareBanner({
  title,
  optionA,
  optionB,
  shareUrl,
}: CreateShareBannerProps) {
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-8 border border-[#CCFF00]/40 bg-[#CCFF00]/10 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p
            className="text-[#CCFF00]"
            style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
          >
            BATTLE LIVE
          </p>
          <p className="mt-1 text-white" style={{ fontSize: 15, fontWeight: 700 }}>
            Share this fight in your group chat — that&apos;s how battles go viral.
          </p>
          <p className="mt-1 text-white/50" style={{ fontSize: 13 }}>
            {buildBattleShareText(title, optionA, optionB, shareUrl)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCopy} className="gap-2">
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied!" : "Copy link"}
          </Button>
          <Button variant="outline" onClick={() => setDismissed(true)}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
