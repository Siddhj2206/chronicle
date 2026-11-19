import type { Metadata } from "next";
import type { Post, User } from "@/lib/db/schema";

export const SITE_DESCRIPTION =
  "Stories and ideas, thoughtfully shared on Chronicle.";

export function siteUrl(path = "/"): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const base = new URL(configured);
  if (
    !["https:", "http:"].includes(base.protocol) ||
    base.username ||
    base.password
  )
    throw new Error("NEXT_PUBLIC_APP_URL must be an http(s) site URL");
  return new URL(path, base.origin).href;
}

export function cleanUsername(value: string): string {
  try {
    return decodeURIComponent(value).replace(/^@/, "");
  } catch {
    return "";
  }
}

export function authorPath(username: string): string {
  return `/@${encodeURIComponent(username)}`;
}

export function articlePath(username: string, slug: string): string {
  return `${authorPath(username)}/${encodeURIComponent(slug)}`;
}

export function feedAlternates(
  username?: string,
): Record<string, { url: string; title: string }[]> {
  return {
    "application/rss+xml": [
      { url: siteUrl("/feed.xml"), title: "Chronicle" },
      ...(username
        ? [
            {
              url: siteUrl(`${authorPath(username)}/feed.xml`),
              title: `@${username} on Chronicle`,
            },
          ]
        : []),
    ],
  };
}

export function pageMetadata({
  title,
  description,
  path,
  username,
}: {
  title: string;
  description: string;
  path: string;
  username?: string;
}): Metadata {
  const url = siteUrl(path);
  const images = [
    {
      url: siteUrl("/og"),
      width: 1200,
      height: 630,
      alt: "Chronicle — stories and ideas",
    },
  ];
  return {
    title,
    description,
    alternates: { canonical: url, types: feedAlternates(username) },
    openGraph: {
      title,
      description,
      url,
      siteName: "Chronicle",
      type: username ? "profile" : "website",
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

type Article = Pick<
  Post,
  | "title"
  | "slug"
  | "excerpt"
  | "published"
  | "publishedAt"
  | "createdAt"
  | "updatedAt"
>;
type Author = Pick<User, "name" | "username">;

export function articleMetadata(post: Article, author: Author): Metadata {
  if (!post.published || !author.username)
    return {
      title: "Draft | Chronicle",
      robots: { index: false, follow: false },
      openGraph: null,
      twitter: null,
    };
  const path = articlePath(author.username, post.slug);
  const metadata = pageMetadata({
    title: `${post.title} | Chronicle`,
    description: post.excerpt || SITE_DESCRIPTION,
    path,
  });
  const images = [
    {
      url: siteUrl(`${path}/og`),
      width: 1200,
      height: 630,
      alt: `${post.title} — ${author.name}`,
    },
  ];
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      title: post.title,
      type: "article",
      publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [siteUrl(authorPath(author.username))],
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || SITE_DESCRIPTION,
      images,
    },
  };
}

export function articleJsonLd(
  post: Article,
  author: Author,
): Record<string, unknown> | null {
  if (!post.published || !author.username) return null;
  const url = siteUrl(articlePath(author.username, post.slug));
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    author: {
      "@type": "Person",
      name: author.name,
      url: siteUrl(authorPath(author.username)),
    },
    datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: `${url}/og`,
    mainEntityOfPage: url,
  };
}

export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
