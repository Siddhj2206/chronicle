"use server";

import { eq, and, desc, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { post, user } from "@/lib/db/schema";

/**
 * Search posts using full-text search
 * Uses pre-computed searchVector column for fast, ranked search across title, excerpt, and content
 * Falls back to title-only search for posts without searchVector (pre-migration)
 */
export async function searchPosts(query: string) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.trim();

  try {
    // Primary: Use pre-computed searchVector for ranked full-text search
    // The searchVector contains weighted text: title (A), excerpt (B), content (C)
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
        rank: sql<number>`ts_rank(
          to_tsvector('english', COALESCE(${post.searchVector}, ${post.title})),
          plainto_tsquery('english', ${searchTerm})
        )`.as("rank"),
      })
      .from(post)
      .innerJoin(user, eq(post.authorId, user.id))
      .where(
        and(
          eq(post.published, true),
          sql`to_tsvector('english', COALESCE(${post.searchVector}, ${post.title})) @@ plainto_tsquery('english', ${searchTerm})`
        )
      )
      // Order by relevance rank (descending), then by publish date
      .orderBy(sql`rank DESC`, desc(post.publishedAt))
      .limit(20);

    // Return without the rank field (it was just for sorting)
    return result.map(({ post, author }) => ({ post, author }));
  } catch (error) {
    console.error("Search posts error:", error);
    
    // Fallback: ILIKE search on title, excerpt, and content
    try {
      const likePattern = `%${searchTerm}%`;
      
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
        .where(
          and(
            eq(post.published, true),
            sql`(
              ${post.title} ILIKE ${likePattern} OR
              ${post.excerpt} ILIKE ${likePattern} OR
              ${post.searchVector} ILIKE ${likePattern}
            )`
          )
        )
        .orderBy(desc(post.publishedAt))
        .limit(20);

      return result;
    } catch (fallbackError) {
      console.error("Search fallback error:", fallbackError);
      return [];
    }
  }
}
