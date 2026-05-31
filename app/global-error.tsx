"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black p-8 text-white">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <button
          type="button"
          onClick={() => reset()}
          className="bg-[#CCFF00] px-4 py-2 font-bold text-black"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
