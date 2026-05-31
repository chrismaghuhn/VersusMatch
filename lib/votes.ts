"use client";

import { v4 as uuidv4 } from "uuid";
import { parseJsonResponse } from "@/lib/parse-json-response";

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
  let response: Response;

  try {
    response = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        battleId,
        optionId,
        voterToken,
        turnstileToken,
      }),
    });
  } catch {
    return { success: false, error: "Netzwerkfehler — bitte erneut versuchen." };
  }

  const data = await parseJsonResponse<{
    success?: boolean;
    error?: string;
    alreadyVoted?: boolean;
  }>(response);

  if (!data) {
    return {
      success: false,
      error: response.ok
        ? "Ungültige Server-Antwort."
        : `Vote fehlgeschlagen (${response.status}).`,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error: data.error ?? "Vote fehlgeschlagen",
      alreadyVoted: data.alreadyVoted,
    };
  }

  return { success: true };
}
