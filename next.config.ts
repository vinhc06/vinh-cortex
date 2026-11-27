import type { NextConfig } from "next";
import { cortexIndexHref } from "./src/data/navigation";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  redirects() {
    // Keep /index out of the prerendered routes so it can't shadow the root on Vercel.
    return [{ source: "/index", destination: cortexIndexHref, permanent: true }];
  },
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
