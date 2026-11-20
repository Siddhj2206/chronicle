"use server";

import { eq, and, desc, sql, gte } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { withResponseCounts } from "@/lib/response-counts";
import { post, user, postTag, tag } from "@/lib/db/schema";
import { withPostTags } from "@/lib/post-tags";

import type { Post } from "@/lib/db/schema";

// ============================================
// Types
// ============================================

export type DatePreset = "week" | "month" | "year";

export interface SearchParams {
  tag?: string;
  query: string;
  author?: string; // Filter by username
  datePreset?: DatePreset; // Quick date presets
  cursor?: string; // Encoded sort tuple for cursor pagination
  limit?: number; // Results per page (default 10)
}

export interface AuthorInfo {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
}

export interface SearchResultPost {
  post: Post & { responseCount?: number };
  author: AuthorInfo;
}

export interface SearchResult {
  posts: SearchResultPost[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface AuthorWithPosts {
  username: string;
  name: string;
  image: string | null;
  postCount: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate date threshold based on preset
 */
function getDateThreshold(preset: DatePreset): Date {
  const now = new Date();
  switch (preset) {
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "year":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(0); // Beginning of time
  }
}

// ============================================
// Main Search Function
// ============================================

const searchCursorSchema = z.object({
  rank: z.string().refine((value) => Number.isFinite(Number(value))),
  publishedAt: z
    .string()
    .refine(
      (value) => value === "infinity" || Number.isFinite(Date.parse(value)),
    ),
  id: z.string(),
  fallback: z.boolean(),
});

/**
 * Search posts with full-text search, pagination, and filters
 *
 * Features:
 * - Full-text search across title, excerpt, and content (via searchVector)
 * - Relevance ranking with ts_rank
 * - Author filtering by username
 * - Date preset filtering (last week/month/year)
 * - Cursor-based pagination for "Load More" UX
 *
 * @param params - Search parameters
 * @returns Paginated search results
 */
export async function searchPosts(params: SearchParams): Promise<SearchResult> {
  const {
    query,
    author,
    datePreset,
    cursor,
    limit = 10,
    tag: tagSlug,
  } = params;
  const tagFilter = tagSlug
    ? sql`exists (select 1 from ${postTag} inner join ${tag} on ${tag.id} = ${postTag.tagId} where ${postTag.postId} = ${post.id} and ${tag.slug} = ${tagSlug})`
    : undefined;

  // Empty query returns empty results
  if (!query || !/[\p{L}\p{N}]/u.test(query)) {
    return { posts: [], hasMore: false, nextCursor: null };
  }

  const searchTerm = query.trim();
  const likePattern = `%${searchTerm}%`;
  const empty: SearchResult = { posts: [], hasMore: false, nextCursor: null };
  let after: z.infer<typeof searchCursorSchema> | undefined;
  if (cursor) {
    let decoded: unknown;
    try {
      decoded = JSON.parse(Buffer.from(cursor, "base64url").toString());
    } catch {
      return empty;
    }
    const parsed = searchCursorSchema.safeParse(decoded);
    if (!parsed.success) return empty;
    after = parsed.data;
  }
  // Preserve PostgreSQL's microseconds and DESC NULLS FIRST ordering.
  const publishedAt = sql`COALESCE(${post.publishedAt}, 'infinity'::timestamp)`;
  const rank = sql`CASE
    WHEN plainto_tsquery('english', ${searchTerm}) != ''::tsquery
    THEN ts_rank(
      to_tsvector('english', COALESCE(${post.searchVector}, ${post.title})),
      plainto_tsquery('english', ${searchTerm})
    )
    ELSE 0::real
  END`;

  try {
    const db = await getDb();
    if (after?.fallback) throw new Error("Continue fallback pagination");
    // Build WHERE conditions dynamically
    // Hybrid approach: full-text search with ILIKE fallback for stop words
    // When plainto_tsquery returns empty (e.g., searching "where"), we fall back to ILIKE
    const conditions = [
      eq(post.published, true),
      // Hybrid search condition
      sql`(
        to_tsvector('english', COALESCE(${post.searchVector}, ${post.title})) @@ plainto_tsquery('english', ${searchTerm})
        OR
        (
          plainto_tsquery('english', ${searchTerm}) = ''::tsquery
          AND (${post.title} ILIKE ${likePattern} OR ${post.excerpt} ILIKE ${likePattern})
        )
      )`,
    ];

    // Add author filter if specified
    if (author) {
      conditions.push(eq(user.username, author));
    }

    // Add date preset filter if specified
    if (datePreset) {
      const threshold = getDateThreshold(datePreset);
      conditions.push(gte(post.publishedAt, threshold));
    }

    if (after) {
      conditions.push(sql`(${rank}, ${publishedAt}, ${post.id}) <
        (${after.rank}::real, ${after.publishedAt}::text::timestamp, ${after.id})`);
    }

    // Execute query with all conditions
    const result = await db
      .select({
        post: post,
        author: {
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
        },
        // Round-trip the real value as PostgreSQL text, not a JavaScript float.
        rank: sql<string>`(${rank})::text`,
        cursorDate: sql<string>`${publishedAt}::text`,
      })
      .from(post)
      .innerJoin(user, eq(post.authorId, user.id))
      .where(and(...conditions, tagFilter))
      // Order by relevance rank (descending), then by publish date, then by ID for stable cursor
      .orderBy(desc(rank), desc(publishedAt), desc(post.id))
      // Fetch one extra to determine if there are more results
      .limit(limit + 1);

    // Determine if there are more results
    const hasMore = result.length > limit;

    // Trim to requested limit
    const posts = result
      .slice(0, limit)
      .map(({ post, author }) => ({ post, author }));

    const last = result[posts.length - 1];
    const nextCursor =
      hasMore && posts.length > 0
        ? Buffer.from(
            JSON.stringify({
              rank: last.rank,
              publishedAt: last.cursorDate,
              id: last.post.id,
              fallback: false,
            }),
          ).toString("base64url")
        : null;

    return {
      posts: await withResponseCounts(await withPostTags(posts)),
      hasMore,
      nextCursor,
    };
  } catch (error) {
    if (!after?.fallback) console.error("Search posts error:", error);
    if (after && !after.fallback) return empty;

    // Fallback: Simple ILIKE search without full-text
    try {
      const db = await getDb();
      const likePattern = `%${searchTerm}%`;
      const fallbackConditions = [
        eq(post.published, true),
        sql`(
          ${post.title} ILIKE ${likePattern} OR
          ${post.excerpt} ILIKE ${likePattern}
        )`,
      ];

      if (author) {
        fallbackConditions.push(eq(user.username, author));
      }

      if (datePreset) {
        const threshold = getDateThreshold(datePreset);
        fallbackConditions.push(gte(post.publishedAt, threshold));
      }

      if (after) {
        fallbackConditions.push(sql`(${publishedAt}, ${post.id}) <
          (${after.publishedAt}::text::timestamp, ${after.id})`);
      }

      const result = await db
        .select({
          post: post,
          cursorDate: sql<string>`${publishedAt}::text`,
          author: {
            id: user.id,
            name: user.name,
            username: user.username,
            image: user.image,
          },
        })
        .from(post)
        .innerJoin(user, eq(post.authorId, user.id))
        .where(and(...fallbackConditions, tagFilter))
        .orderBy(desc(publishedAt), desc(post.id))
        .limit(limit + 1);

      const hasMore = result.length > limit;
      const posts = result
        .slice(0, limit)
        .map(({ post, author }) => ({ post, author }));
      const last = result[posts.length - 1];
      const nextCursor =
        hasMore && posts.length > 0
          ? Buffer.from(
              JSON.stringify({
                rank: "0",
                publishedAt: last.cursorDate,
                id: last.post.id,
                fallback: true,
              }),
            ).toString("base64url")
          : null;

      return {
        posts: await withResponseCounts(await withPostTags(posts)),
        hasMore,
        nextCursor,
      };
    } catch (fallbackError) {
      console.error("Search fallback error:", fallbackError);
      return { posts: [], hasMore: false, nextCursor: null };
    }
  }
}

// ============================================
// Author Lookup for Filters
// ============================================

/**
 * Get list of authors who have published posts
 * Used for the author filter autocomplete/combobox
 *
 * @returns Array of authors with their post counts, sorted by post count
 */
export async function getAuthorsWithPosts(): Promise<AuthorWithPosts[]> {
  try {
    const db = await getDb();
    const result = await db
      .select({
        username: user.username,
        name: user.name,
        image: user.image,
        postCount: sql<number>`count(${post.id})::int`.as("post_count"),
      })
      .from(user)
      .innerJoin(post, eq(post.authorId, user.id))
      .where(eq(post.published, true))
      .groupBy(user.id, user.username, user.name, user.image)
      .orderBy(sql`post_count DESC`)
      .limit(50);

    // Filter out null usernames and cast to correct type
    return result
      .filter((r): r is AuthorWithPosts => r.username !== null)
      .map((r) => ({
        username: r.username!,
        name: r.name,
        image: r.image,
        postCount: r.postCount,
      }));
  } catch (error) {
    console.error("Get authors error:", error);
    return [];
  }
}
