import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/invoices", destination: "/money-in", permanent: true },
      { source: "/trends", destination: "/money-in", permanent: true },
      { source: "/budgets", destination: "/money-out", permanent: true },
      { source: "/accounting", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
