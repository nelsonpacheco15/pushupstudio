import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Voice recordings are sent to a server action; raise the default 1MB cap.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
