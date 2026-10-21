import type { NextConfig } from "next";
import path from "path";

/** App root is this repo (`quantum-life-university`), not a nested package folder. */
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  experimental: {
    optimizePackageImports: ["@supabase/ssr", "@supabase/supabase-js"],
    // Day JSON + optional cover image can exceed the 1 MB default.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
