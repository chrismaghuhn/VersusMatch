"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "@/components/battle-vote-ui";
import { buildBattleEmbedSnippet } from "@/lib/embed";

type EmbedCodeCopyButtonProps = {
  slug: string;
  variant?: "default" | "outline";
};

export function EmbedCodeCopyButton({ slug, variant = "outline" }: EmbedCodeCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(buildBattleEmbedSnippet(slug));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant={variant} onClick={handleCopy} className="gap-2">
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copied!" : "Copy embed code"}
    </Button>
  );
}
