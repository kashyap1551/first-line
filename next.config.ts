import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
      // "file.md?raw" is loaded as text at build time (lib/help-centre.ts).
      "*.md": { condition: { query: "?raw" }, type: "text" },
    },
  },
};

export default nextConfig;
