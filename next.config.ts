import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
