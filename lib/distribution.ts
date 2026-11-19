import { cache } from "react";

import { and, desc, eq, isNotNull, ne, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { post, user } from "@/lib/db/schema";
import { articlePath, authorPath, siteUrl } from "@/lib/seo";

import type { Post, User } from "@/lib/db/schema";

export interface DistributionPost {
  post: Pick<
    Post,
    | "id"
    | "title"
    | "slug"
    | "excerpt"
    | "publishedAt"
    | "createdAt"
    | "updatedAt"
  >;
  author: { name: string; username: string };
}

const publicAuthor = and(isNotNull(user.username), ne(user.username, ""));
const fields = {
  post: {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  },
  author: { name: user.name, username: user.username },
};

export const getPublicAuthor = cache(
  async (
    username: string,
  ): Promise<
    (Pick<User, "id" | "name" | "image" | "bio"> & { username: string }) | null
  > => {
    const db = await getDb();
    const [author] = await db
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
        bio: user.bio,
        username: user.username,
      })
      .from(user)
      .where(and(eq(user.username, username), publicAuthor))
      .limit(1);
    return author?.username ? { ...author, username: author.username } : null;
  },
);

export async function getFeedPosts(
  username?: string,
): Promise<DistributionPost[]> {
  const db = await getDb();
  const rows = await db
    .select(fields)
    .from(post)
    .innerJoin(user, eq(post.authorId, user.id))
    .where(
      and(
        eq(post.published, true),
        publicAuthor,
        username === undefined ? undefined : eq(user.username, username),
      ),
    )
    .orderBy(
      desc(sql`coalesce(${post.publishedAt}, ${post.createdAt})`),
      desc(post.id),
    )
    .limit(20);
  return rows.map((row) => ({
    ...row,
    author: { ...row.author, username: row.author.username! },
  }));
}

export async function getPublicArticle(
  username: string,
  slug: string,
): Promise<DistributionPost | null> {
  const db = await getDb();
  const [row] = await db
    .select(fields)
    .from(post)
    .innerJoin(user, eq(post.authorId, user.id))
    .where(
      and(
        eq(post.published, true),
        eq(user.username, username),
        eq(post.slug, slug),
        publicAuthor,
      ),
    )
    .limit(1);
  return row?.author.username
    ? { ...row, author: { ...row.author, username: row.author.username } }
    : null;
}

export async function getSitemapData(): Promise<{
  posts: { slug: string; username: string | null; updatedAt: Date }[];
  authors: { username: string | null }[];
}> {
  const db = await getDb();
  const [posts, authors] = await Promise.all([
    db
      .select({
        slug: post.slug,
        username: user.username,
        updatedAt: post.updatedAt,
      })
      .from(post)
      .innerJoin(user, eq(post.authorId, user.id))
      .where(and(eq(post.published, true), publicAuthor)),
    db.select({ username: user.username }).from(user).where(publicAuthor),
  ]);
  return { posts, authors };
}

export function escapeXml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  };
  return value
    .replace(
      /[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu,
      "",
    )
    .replace(/[&<>"']/g, (character) => entities[character]);
}

export function renderRss(
  rows: DistributionPost[],
  author?: { username: string; name: string },
): string {
  const path = author ? authorPath(author.username) : "/";
  const title = author ? `${author.name} on Chronicle` : "Chronicle";
  const self = siteUrl(author ? `${path}/feed.xml` : "/feed.xml");
  const items = rows
    .map(({ post, author }) => {
      const url = escapeXml(siteUrl(articlePath(author.username, post.slug)));
      return `<item><title>${escapeXml(post.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${escapeXml(post.excerpt || post.title)}</description><dc:creator>${escapeXml(author.name)}</dc:creator><pubDate>${(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate></item>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${escapeXml(title)}</title><link>${escapeXml(siteUrl(path))}</link><description>Stories and ideas on Chronicle.</description><language>en</language><atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}

export async function feedResponse(username?: string): Promise<Response> {
  try {
    const author =
      username === undefined ? undefined : await getPublicAuthor(username);
    if (author === null)
      return new Response("Author not found", { status: 404 });
    const rows = await getFeedPosts(username);
    return new Response(renderRss(rows, author), {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("RSS feed error:", error);
    return new Response("Feed temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
