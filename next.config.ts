import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 dias
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sweetscan.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'beta.sweetscan.org',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost:3000',
        pathname: '/**',
      },
    ],
  },

};

export default nextConfig;
