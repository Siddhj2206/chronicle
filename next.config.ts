import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // For Google Auth avatars
      },
      {
        protocol: "https",
        hostname: "pub-*.r2.dev", // Generic R2 pattern, might need adjustment based on specific R2 setup
      },
    ],
  },
};

export default nextConfig;
