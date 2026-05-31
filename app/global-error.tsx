"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="de">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold">Etwas ist schiefgelaufen</h1>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Erneut versuchen
        </button>
      </body>
    </html>
  );
}
