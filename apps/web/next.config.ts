import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // cacheComponents / partialPrefetching are off: with them the Cloudflare adapter hangs every request ("worker's code had hung").
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// The Sentry build plugin wraps server code in a way Next's cacheComponents rejects (`Date.now()` while prerendering),
// so it is only applied when a DSN is configured, i.e. for deployed builds. Local dev and CI run without it.
// Source maps upload only when SENTRY_AUTH_TOKEN (plus org/project) is set in the build environment.
export default process.env.NEXT_PUBLIC_SENTRY_DSN ? withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
}) : nextConfig;
