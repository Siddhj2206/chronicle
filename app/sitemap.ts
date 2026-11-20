import { getSitemapData } from "@/lib/distribution";
import { articlePath, authorPath, siteUrl } from "@/lib/seo";

import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { posts, authors } = await getSitemapData();
  return [
    ...["/", "/archive", "/search"].map((path) => ({ url: siteUrl(path) })),
    ...authors.map(({ username }) => ({ url: siteUrl(authorPath(username!)) })),
    ...posts.map(({ slug, username, updatedAt }) => ({
      url: siteUrl(articlePath(username!, slug)),
      lastModified: updatedAt,
    })),
  ];
}
