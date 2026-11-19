import type { NextConfig } from "next";

import { imageRemotePatterns } from "./lib/image-sources";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageRemotePatterns,
  },
};

export default nextConfig;
