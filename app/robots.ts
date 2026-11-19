import { siteUrl } from "@/lib/seo";

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/new",
        "/edit/",
        "/manuscripts",
        "/settings",
        "/sign-in",
        "/onboarding",
      ],
    },
    sitemap: siteUrl("/sitemap.xml"),
  };
}
