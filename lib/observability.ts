import * as Sentry from "@sentry/nextjs";

export function captureServerError(scope: string, error: unknown, context?: Record<string, string>) {
  console.error(`[observability:${scope}]`, error, context);

  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.withScope((sentryScope) => {
    sentryScope.setTag("scope", scope);

    if (context) {
      sentryScope.setContext("context", context);
    }

    if (error instanceof Error) {
      Sentry.captureException(error);
      return;
    }

    Sentry.captureMessage(typeof error === "string" ? error : JSON.stringify(error), "error");
  });
}
