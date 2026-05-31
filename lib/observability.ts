export function captureServerError(scope: string, error: unknown, context?: Record<string, string>) {
  const payload = {
    scope,
    context,
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    timestamp: new Date().toISOString(),
  };

  console.error(`[observability:${scope}]`, JSON.stringify(payload));

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  void fetch("https://sentry.io/api/0/envelope/", {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Sentry optional — ignore transport failures
  });
}
