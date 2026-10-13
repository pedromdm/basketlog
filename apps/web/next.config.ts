import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // dev server is reached via 127.0.0.1 (Supabase auth redirects use it); Next blocks other origins' dev resources
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
