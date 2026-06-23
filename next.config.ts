import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project — a stray ~/pnpm-lock.yaml otherwise
  // makes Next infer the home directory as the root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
