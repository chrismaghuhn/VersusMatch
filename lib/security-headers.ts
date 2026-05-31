import type { NextConfig } from "next";

export function buildContentSecurityPolicy(frameAncestors: string, supabaseHost: string): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://${supabaseHost}`,
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://challenges.cloudflare.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://api.resend.com`,
    "worker-src 'self' blob:",
    "frame-src https://challenges.cloudflare.com",
    "font-src 'self' data:",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function buildSecurityHeaders(supabaseHost: string): NextConfig["headers"] {
  const defaultCsp = buildContentSecurityPolicy("'none'", supabaseHost);
  const embedCsp = buildContentSecurityPolicy("*", supabaseHost);

  const sharedHeaders = [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
  ];

  return async () => [
    {
      source: "/embed/:path*",
      headers: [...sharedHeaders, { key: "Content-Security-Policy", value: embedCsp }],
    },
    {
      source: "/((?!embed).*)",
      headers: [
        ...sharedHeaders,
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: defaultCsp },
      ],
    },
  ];
}
