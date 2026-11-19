import type { NextConfig } from "next";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

import { imageRemotePatterns } from "./lib/image-sources";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageRemotePatterns,
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
