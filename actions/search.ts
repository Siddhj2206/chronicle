"use server";

import { eq, and, desc, sql, gte, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { post, user } from "@/lib/db/schema";

import type { Post } from "@/lib/db/schema";

// ============================================
// Types
// ============================================

export type DatePreset = "week" | "month" | "year";

export interface SearchParams {
  query: string;
  author?: string;          // Filter by username
  datePreset?: DatePreset;  // Quick date presets
  cursor?: string;          // Post ID for cursor pagination
  limit?: number;           // Results per page (default 10)
}

export interface AuthorInfo {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
}

export interface SearchResultPost {
  post: Post;
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
  const { query, author, datePreset, cursor, limit = 10 } = params;

  // Empty query returns empty results
  if (!query || query.trim().length === 0) {
    return { posts: [], hasMore: false, nextCursor: null };
  }

  const searchTerm = query.trim();
  const likePattern = `%${searchTerm}%`;

  try {
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

    // Add cursor condition for pagination (fetch posts with ID less than cursor)
    // This works because we're ordering by rank DESC, then publishedAt DESC
    // For stable pagination, we use the post ID as cursor
    if (cursor) {
      conditions.push(lt(post.id, cursor));
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
        // Calculate relevance rank for sorting
        // Use CASE to handle empty tsquery (stop words only) - fall back to 0 rank
        rank: sql<number>`CASE
          WHEN plainto_tsquery('english', ${searchTerm}) != ''::tsquery
          THEN ts_rank(
            to_tsvector('english', COALESCE(${post.searchVector}, ${post.title})),
            plainto_tsquery('english', ${searchTerm})
          )
          ELSE 0
        END`.as("rank"),
      })
      .from(post)
      .innerJoin(user, eq(post.authorId, user.id))
      .where(and(...conditions))
      // Order by relevance rank (descending), then by publish date, then by ID for stable cursor
      .orderBy(sql`rank DESC`, desc(post.publishedAt), desc(post.id))
      // Fetch one extra to determine if there are more results
      .limit(limit + 1);

    // Determine if there are more results
    const hasMore = result.length > limit;
    
    // Trim to requested limit
    const posts = result.slice(0, limit).map(({ post, author }) => ({ post, author }));
    
    // Get cursor for next page (last post's ID)
    const nextCursor = hasMore && posts.length > 0 
      ? posts[posts.length - 1].post.id 
      : null;

    return { posts, hasMore, nextCursor };
  } catch (error) {
    console.error("Search posts error:", error);
    
    // Fallback: Simple ILIKE search without full-text
    try {
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

      if (cursor) {
        fallbackConditions.push(lt(post.id, cursor));
      }

      const result = await db
        .select({
          post: post,
          author: {
            id: user.id,
            name: user.name,
            username: user.username,
            image: user.image,
          },
        })
        .from(post)
        .innerJoin(user, eq(post.authorId, user.id))
        .where(and(...fallbackConditions))
        .orderBy(desc(post.publishedAt), desc(post.id))
        .limit(limit + 1);

      const hasMore = result.length > limit;
      const posts = result.slice(0, limit);
      const nextCursor = hasMore && posts.length > 0 
        ? posts[posts.length - 1].post.id 
        : null;

      return { posts, hasMore, nextCursor };
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
