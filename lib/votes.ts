"use client";

import { v4 as uuidv4 } from "uuid";

const VOTER_TOKEN_KEY = "memefight_voter_token";

export function getOrCreateVoterToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = localStorage.getItem(VOTER_TOKEN_KEY);
  if (existing) {
    return existing;
  }

  const token = uuidv4();
  localStorage.setItem(VOTER_TOKEN_KEY, token);
  return token;
}

export async function castVote(
  battleId: string,
  optionId: string,
  voterToken: string,
  turnstileToken?: string
): Promise<{ success: boolean; error?: string; alreadyVoted?: boolean }> {
  const response = await fetch("/api/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      battleId,
      optionId,
      voterToken,
      turnstileToken,
    }),
  });

  const data = (await response.json()) as {
    success?: boolean;
    error?: string;
    alreadyVoted?: boolean;
  };

  if (!response.ok) {
    return {
      success: false,
      error: data.error ?? "Vote fehlgeschlagen",
      alreadyVoted: data.alreadyVoted,
    };
  }

  return { success: true };
}
