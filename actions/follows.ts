"use server";

import { revalidatePath } from "next/cache";

import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { follow, post, user } from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { revalidatePosts } from "@/lib/revalidate-posts";

import type { Post, User } from "@/lib/db/schema";

type FollowResult = { success: true; following: boolean } | { error: string };

interface FollowInfo {
  followers: number;
  following: number;
  isFollowing: boolean;
  viewerId: string | null;
}

interface FollowingFeed {
  posts: {
    post: Post;
    author: Pick<User, "id" | "name" | "username" | "image">;
  }[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const authorIdSchema = z.string().trim().min(1).max(200);
const feedSchema = z.object({
  page: z.number().int().min(1).max(100000).default(1),
  limit: z.number().int().min(1).max(50).default(10),
});

export async function toggleFollow(authorId: string): Promise<FollowResult> {
  const viewer = await getSession();
  if (!viewer?.user.id) return { error: "Unauthorized" };
  const parsed = authorIdSchema.safeParse(authorId);
  if (!parsed.success) return { error: "Invalid author" };
  if (parsed.data === viewer.user.id)
    return { error: "You cannot follow yourself" };

  try {
    const db = await getDb();
    const [author] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, parsed.data))
      .limit(1);
    if (!author) return { error: "Author not found" };
    const following = await db.transaction(async (tx) => {
      const removed = await tx
        .delete(follow)
        .where(
          and(
            eq(follow.followerId, viewer.user.id),
            eq(follow.followingId, parsed.data),
          ),
        )
        .returning();
      if (removed.length) return false;
      await tx
        .insert(follow)
        .values({ followerId: viewer.user.id, followingId: parsed.data })
        .onConflictDoNothing();
      return true;
    });
    revalidatePath("/following");
    await revalidatePosts(parsed.data);
    await revalidatePosts(viewer.user.id, { posts: [] });
    return { success: true, following };
  } catch (error) {
    console.error("Toggle follow error:", error);
    return { error: "Failed to update follow" };
  }
}

export async function getFollowInfo(authorId: string): Promise<FollowInfo> {
  const viewer = await getSession();
  const empty = {
    followers: 0,
    following: 0,
    isFollowing: false,
    viewerId: viewer?.user.id ?? null,
  };
  const parsed = authorIdSchema.safeParse(authorId);
  if (!parsed.success) return empty;
  try {
    const db = await getDb();
    const [[followers], [following], relationship] = await Promise.all([
      db
        .select({ count: count() })
        .from(follow)
        .where(eq(follow.followingId, parsed.data)),
      db
        .select({ count: count() })
        .from(follow)
        .where(eq(follow.followerId, parsed.data)),
      viewer
        ? db
            .select()
            .from(follow)
            .where(
              and(
                eq(follow.followerId, viewer.user.id),
                eq(follow.followingId, parsed.data),
              ),
            )
            .limit(1)
        : Promise.resolve([]),
    ]);
    return {
      ...empty,
      followers: followers.count,
      following: following.count,
      isFollowing: relationship.length > 0,
    };
  } catch (error) {
    console.error("Get follow info error:", error);
    return empty;
  }
}

export async function getFollowingPosts(
  options: { page?: number; limit?: number } = {},
): Promise<FollowingFeed | { error: string }> {
  const viewer = await getSession();
  if (!viewer?.user.id) return { error: "Unauthorized" };
  const parsed = feedSchema.safeParse(options);
  if (!parsed.success) return { error: "Invalid pagination" };
  const { page, limit } = parsed.data;
  const predicate = and(
    eq(follow.followerId, viewer.user.id),
    eq(post.published, true),
  );
  try {
    const db = await getDb();
    const [[total], posts] = await Promise.all([
      db
        .select({ count: count() })
        .from(post)
        .innerJoin(follow, eq(post.authorId, follow.followingId))
        .where(predicate),
      db
        .select({
          post,
          author: {
            id: user.id,
            name: user.name,
            username: user.username,
            image: user.image,
          },
        })
        .from(post)
        .innerJoin(follow, eq(post.authorId, follow.followingId))
        .innerJoin(user, eq(post.authorId, user.id))
        .where(predicate)
        .orderBy(desc(post.publishedAt), desc(post.id))
        .limit(limit)
        .offset((page - 1) * limit),
    ]);
    return {
      posts,
      totalCount: total.count,
      totalPages: Math.ceil(total.count / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error("Get following feed error:", error);
    return { error: "Failed to load following feed" };
  }
}
