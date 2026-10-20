import type { NextConfig } from "next";
import path from "path";

/** App root is this repo (`quantum-life-university`), not a nested package folder. */
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
