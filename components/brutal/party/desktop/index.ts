"use client";

import dynamic from "next/dynamic";

export const PartyDesktopCaption = dynamic(
  () => import("./PartyDesktopCaption").then((m) => m.PartyDesktopCaption),
  { ssr: false }
);

export const PartyDesktopVoting = dynamic(
  () => import("./PartyDesktopVoting").then((m) => m.PartyDesktopVoting),
  { ssr: false }
);

export const PartyDesktopGuess = dynamic(
  () => import("./PartyDesktopGuess").then((m) => m.PartyDesktopGuess),
  { ssr: false }
);

export const PartyDesktopReveal = dynamic(
  () => import("./PartyDesktopReveal").then((m) => m.PartyDesktopReveal),
  { ssr: false }
);

export const PartyDesktopFinished = dynamic(
  () => import("./PartyDesktopFinished").then((m) => m.PartyDesktopFinished),
  { ssr: false }
);
