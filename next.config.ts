import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Voice recordings + request photo attachments go through server actions; raise the default 1MB cap.
    serverActions: { bodySizeLimit: "30mb" },
  },
};

export default nextConfig;
