const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

type SentryModule = typeof import("@sentry/nextjs");

let sentryModulePromise: Promise<SentryModule> | null = null;
let initScheduled = false;

function loadSentry(): Promise<SentryModule> {
  if (!sentryModulePromise) {
    sentryModulePromise = import("@sentry/nextjs");
  }
  return sentryModulePromise;
}

function scheduleSentryInit() {
  if (!dsn || initScheduled || typeof window === "undefined") {
    return;
  }

  initScheduled = true;

  const init = () => {
    void loadSentry().then((Sentry) => {
      Sentry.init({
        dsn,
        enabled: true,
        sendDefaultPii: true,
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        enableLogs: false,
        integrations: [],
      });
    });
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(init, { timeout: 4000 });
  } else {
    setTimeout(init, 2000);
  }
}

scheduleSentryInit();

export function onRouterTransitionStart(...args: Parameters<SentryModule["captureRouterTransitionStart"]>) {
  if (!dsn) return;

  void loadSentry().then((Sentry) => {
    Sentry.captureRouterTransitionStart(...args);
  });
}
