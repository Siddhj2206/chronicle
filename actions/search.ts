"use server";

import { eq, and, desc, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { post, user } from "@/lib/db/schema";

export async function searchPosts(query: string) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.trim();

  try {
    // Use PostgreSQL full-text search on title
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
          sql`to_tsvector('english', ${post.title}) @@ plainto_tsquery('english', ${searchTerm})`
        )
      )
      .orderBy(desc(post.publishedAt))
      .limit(20);

    return result;
  } catch (error) {
    console.error("Search posts error:", error);
    // Fallback to ILIKE search if full-text search fails
    try {
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
            sql`${post.title} ILIKE ${"%" + searchTerm + "%"}`
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
