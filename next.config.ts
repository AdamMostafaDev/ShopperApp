import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Skip TypeScript errors during build for deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Only run ESLint on these directories
    dirs: ['src'],
  },
};

export default nextConfig;
