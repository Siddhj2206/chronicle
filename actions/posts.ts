"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { eq, and, desc, asc, gte, notInArray, sql, like } from "drizzle-orm";
import slugify from "slugify";
import { nanoid } from "nanoid";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { post, user } from "@/lib/db/schema";
import { postSchema } from "@/lib/validators";
import {
  uploadContent,
  deleteContent,
  getContent,
  revalidateContent,
} from "@/lib/r2-content";

import type { Post } from "@/lib/db/schema";

// Generate a unique slug - tries clean slug first, then adds suffix only if needed
async function generateUniqueSlug(title: string, authorId: string): Promise<string> {
  const baseSlug = slugify(title, { lower: true, strict: true });
  
  if (!baseSlug) {
    // Fallback for titles that slugify to empty string
    return nanoid(10);
  }

  // Check for existing slugs by this author that start with baseSlug
  const existing = await db
    .select({ slug: post.slug })
    .from(post)
    .where(and(eq(post.authorId, authorId), like(post.slug, `${baseSlug}%`)));

  if (existing.length === 0) {
    return baseSlug;
  }

  const slugs = new Set(existing.map((p) => p.slug));

  // If base slug is available, use it
  if (!slugs.has(baseSlug)) {
    return baseSlug;
  }

  // Try numbered suffixes: title-2, title-3, etc.
  for (let counter = 2; counter <= 100; counter++) {
    const candidate = `${baseSlug}-${counter}`;
    if (!slugs.has(candidate)) {
      return candidate;
    }
  }

  // Fallback to random suffix if somehow we have 100+ posts with same title
  return `${baseSlug}-${nanoid(6)}`;
}

/**
 * Generate search vector SQL for full-text search
 * Title gets weight A (highest), excerpt gets B, content gets C
 */
function generateSearchVector(title: string, excerpt: string | null, content: string): string {
  // Strip markdown for cleaner search
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  // Combine with weights for PostgreSQL tsvector
  const combined = [
    title,
    title, // Double weight for title
    excerpt || "",
    cleanContent,
  ].join(" ");

  return combined;
}

export async function createPost(formData: FormData) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    excerpt: formData.get("excerpt") || undefined,
    coverImage: formData.get("coverImage") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { title, content, excerpt, coverImage } = parsed.data;

  // Generate unique slug (clean, only adds suffix on conflict)
  const slug = await generateUniqueSlug(title, session.user.id);

  // Generate a temporary ID for the post (will be replaced by DB)
  const tempId = crypto.randomUUID();

  try {
    // Upload content to R2 first
    const contentPath = await uploadContent(tempId, content);

    // Generate search vector for full-text search
    const searchVector = generateSearchVector(title, excerpt || null, content);

    const [newPost] = await db
      .insert(post)
      .values({
        id: tempId, // Use the same ID we used for R2
        authorId: session.user.id,
        title,
        slug,
        content, // Keep in DB for now (migration period)
        contentPath,
        excerpt: excerpt || null,
        coverImage: coverImage || null,
        published: false,
        searchVector,
      })
      .returning();

    revalidatePath("/manuscripts");

    return { success: true, slug: newPost.slug };
  } catch (error) {
    console.error("Create post error:", error);
    // Try to clean up R2 content if DB insert failed
    try {
      await deleteContent(tempId);
    } catch {
      // Ignore cleanup errors
    }
    return { error: "Failed to create post" };
  }
}

export async function updatePost(slug: string, formData: FormData) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    excerpt: formData.get("excerpt") || undefined,
    coverImage: formData.get("coverImage") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { title, content, excerpt, coverImage } = parsed.data;

  try {
    // First get the post to get its ID
    const existingPost = await db
      .select({ id: post.id })
      .from(post)
      .where(and(eq(post.slug, slug), eq(post.authorId, session.user.id)))
      .limit(1);

    if (existingPost.length === 0) {
      return { error: "Post not found" };
    }

    const postId = existingPost[0].id;

    // Upload new content to R2
    const contentPath = await uploadContent(postId, content);

    // Generate updated search vector
    const searchVector = generateSearchVector(title, excerpt || null, content);

    const [updatedPost] = await db
      .update(post)
      .set({
        title,
        content, // Keep in DB for now (migration period)
        contentPath,
        excerpt: excerpt || null,
        coverImage: coverImage || null,
        searchVector,
        updatedAt: new Date(),
      })
      .where(and(eq(post.slug, slug), eq(post.authorId, session.user.id)))
      .returning();

    if (!updatedPost) {
      return { error: "Post not found" };
    }

    // Revalidate content cache
    await revalidateContent(postId);

    revalidatePath("/manuscripts");
    revalidatePath(`/@${(session.user as { username?: string }).username}/${slug}`);

    return { success: true, slug: updatedPost.slug };
  } catch (error) {
    console.error("Update post error:", error);
    return { error: "Failed to update post" };
  }
}

export async function deletePost(slug: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const [deletedPost] = await db
      .delete(post)
      .where(and(eq(post.slug, slug), eq(post.authorId, session.user.id)))
      .returning();

    if (!deletedPost) {
      return { error: "Post not found" };
    }

    // Delete content from R2
    await deleteContent(deletedPost.id);

    revalidatePath("/manuscripts");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Delete post error:", error);
    return { error: "Failed to delete post" };
  }
}

export async function publishPost(slug: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const [publishedPost] = await db
      .update(post)
      .set({
        published: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(post.slug, slug), eq(post.authorId, session.user.id)))
      .returning();

    if (!publishedPost) {
      return { error: "Post not found" };
    }

    revalidatePath("/manuscripts");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Publish post error:", error);
    return { error: "Failed to publish post" };
  }
}

export async function unpublishPost(slug: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const [unpublishedPost] = await db
      .update(post)
      .set({
        published: false,
        updatedAt: new Date(),
      })
      .where(and(eq(post.slug, slug), eq(post.authorId, session.user.id)))
      .returning();

    if (!unpublishedPost) {
      return { error: "Post not found" };
    }

    revalidatePath("/manuscripts");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Unpublish post error:", error);
    return { error: "Failed to unpublish post" };
  }
}

// Query functions

// Wrapped with React.cache() for per-request deduplication
// This prevents duplicate DB queries when generateMetadata and page component both call getPost
export const getPost = cache(async function getPost(
  username: string,
  slug: string
): Promise<{ post: Post; author: { id: string; name: string; username: string | null; image: string | null } } | null> {
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
      .where(and(eq(post.slug, slug), eq(user.username, username)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error("Get post error:", error);
    return null;
  }
});

/**
 * Get post content from R2
 * Falls back to database content if R2 content not available (migration period)
 */
export async function getPostContent(postId: string): Promise<string | null> {
  // Try to get from R2 first
  const r2Content = await getContent(postId);
  if (r2Content) {
    return r2Content;
  }

  // Fallback to database content during migration
  try {
    const result = await db
      .select({ content: post.content })
      .from(post)
      .where(eq(post.id, postId))
      .limit(1);

    return result[0]?.content || null;
  } catch (error) {
    console.error("Get post content fallback error:", error);
    return null;
  }
}

export async function getPostForEdit(slug: string): Promise<Post | null> {
  const session = await getSession();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const result = await db
      .select()
      .from(post)
      .where(and(eq(post.slug, slug), eq(post.authorId, session.user.id)))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("Get post for edit error:", error);
    return null;
  }
}

/**
 * Get post for editing with content from R2
 * Returns both post metadata and content
 */
export async function getPostForEditWithContent(slug: string): Promise<{ post: Post; content: string } | null> {
  const session = await getSession();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const result = await db
      .select()
      .from(post)
      .where(and(eq(post.slug, slug), eq(post.authorId, session.user.id)))
      .limit(1);

    const postData = result[0];
    if (!postData) {
      return null;
    }

    // Get content from R2 (with fallback to DB)
    const content = await getPostContent(postData.id);

    return {
      post: postData,
      content: content || postData.content, // Fallback to DB content
    };
  } catch (error) {
    console.error("Get post for edit with content error:", error);
    return null;
  }
}

export async function getPostsByUser(username: string) {
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
      .where(and(eq(user.username, username), eq(post.published, true)))
      .orderBy(desc(post.publishedAt));

    return result;
  } catch (error) {
    console.error("Get posts by user error:", error);
    return [];
  }
}

export async function getMyPosts() {
  const session = await getSession();

  if (!session?.user?.id) {
    return [];
  }

  try {
    const result = await db
      .select()
      .from(post)
      .where(eq(post.authorId, session.user.id))
      .orderBy(desc(post.createdAt));

    return result;
  } catch (error) {
    console.error("Get my posts error:", error);
    return [];
  }
}

export async function getNewestPosts(limit = 10, offset = 0) {
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
      .where(eq(post.published, true))
      .orderBy(desc(post.publishedAt))
      .limit(limit)
      .offset(offset);

    return result;
  } catch (error) {
    console.error("Get newest posts error:", error);
    return [];
  }
}

// Increment view count (fire and forget)
export async function incrementViewCount(postId: string) {
  try {
    await db
      .update(post)
      .set({ viewCount: sql`${post.viewCount} + 1` })
      .where(eq(post.id, postId));
  } catch (error) {
    console.error("Increment view count error:", error);
  }
}

// Get trending posts (last 14 days by view count, backfill with all-time if needed)
export async function getTrendingPosts(limit = 5) {
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Get recent trending posts
    const recentTrending = await db
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
          gte(post.publishedAt, fourteenDaysAgo)
        )
      )
      .orderBy(desc(post.viewCount))
      .limit(limit);

    // If we have enough recent posts, return them
    if (recentTrending.length >= limit) {
      return recentTrending;
    }

    // Backfill with all-time top viewed posts
    const existingIds = recentTrending.map((p) => p.post.id);
    
    if (existingIds.length === 0) {
      // No recent posts, get all-time trending
      const allTimeTrending = await db
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
        .where(eq(post.published, true))
        .orderBy(desc(post.viewCount))
        .limit(limit);

      return allTimeTrending;
    }

    const backfill = await db
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
          notInArray(post.id, existingIds)
        )
      )
      .orderBy(desc(post.viewCount))
      .limit(limit - recentTrending.length);

    return [...recentTrending, ...backfill];
  } catch (error) {
    console.error("Get trending posts error:", error);
    return [];
  }
}

// Get all posts for archive page with pagination and sorting
export async function getAllPosts(options: {
  limit?: number;
  page?: number;
  sort?: "newest" | "trending" | "oldest";
} = {}) {
  const { limit = 10, page = 1, sort = "newest" } = options;
  const offset = (page - 1) * limit;

  try {
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(post)
      .where(eq(post.published, true));

    const totalCount = countResult[0]?.count ?? 0;

    // Determine sort order
    const orderBy =
      sort === "trending"
        ? desc(post.viewCount)
        : sort === "oldest"
          ? asc(post.publishedAt)
          : desc(post.publishedAt); // newest (default)

    // Get posts
    const posts = await db
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
      .where(eq(post.published, true))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return {
      posts,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error("Get all posts error:", error);
    return {
      posts: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: page,
    };
  }
}
