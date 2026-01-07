"use server";

import { revalidatePath } from "next/cache";
import { eq, and, count } from "drizzle-orm";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { like, post, user } from "@/lib/db/schema";

export async function toggleLike(postId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Check if already liked
    const existingLike = await db
      .select()
      .from(like)
      .where(and(eq(like.postId, postId), eq(like.userId, session.user.id)))
      .limit(1)
      .then((rows) => rows[0]);

    if (existingLike) {
      // Unlike
      await db
        .delete(like)
        .where(
          and(eq(like.postId, postId), eq(like.userId, session.user.id))
        );
    } else {
      // Like
      await db.insert(like).values({
        postId,
        userId: session.user.id,
      });
    }

    // Get post for revalidation
    const postData = await db
      .select({ slug: post.slug, authorId: post.authorId })
      .from(post)
      .where(eq(post.id, postId))
      .limit(1)
      .then((rows) => rows[0]);

    if (postData) {
      const author = await db
        .select({ username: user.username })
        .from(user)
        .where(eq(user.id, postData.authorId))
        .limit(1)
        .then((rows) => rows[0]);

      if (author?.username) {
        revalidatePath(`/@${author.username}/${postData.slug}`);
      }
    }

    revalidatePath("/");

    return { success: true, liked: !existingLike };
  } catch (error) {
    console.error("Toggle like error:", error);
    return { error: "Failed to toggle like" };
  }
}

export async function getLikeCount(postId: string): Promise<number> {
  try {
    const result = await db
      .select({ count: count() })
      .from(like)
      .where(eq(like.postId, postId));

    return result[0]?.count || 0;
  } catch (error) {
    console.error("Get like count error:", error);
    return 0;
  }
}

export async function hasUserLiked(postId: string): Promise<boolean> {
  const session = await getSession();

  if (!session?.user?.id) {
    return false;
  }

  try {
    const result = await db
      .select()
      .from(like)
      .where(and(eq(like.postId, postId), eq(like.userId, session.user.id)))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("Has user liked error:", error);
    return false;
  }
}
