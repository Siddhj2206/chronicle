"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { comment, post, user } from "@/lib/db/schema";
import { commentSchema } from "@/lib/validators";

export async function addComment(postId: string, formData: FormData) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const parsed = commentSchema.safeParse({
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await db.insert(comment).values({
      postId,
      authorId: session.user.id,
      content: parsed.data.content,
    });

    // Get post slug and author username in a single JOIN query
    const postWithAuthor = await db
      .select({
        slug: post.slug,
        username: user.username,
      })
      .from(post)
      .innerJoin(user, eq(post.authorId, user.id))
      .where(eq(post.id, postId))
      .limit(1)
      .then((rows) => rows[0]);

    if (postWithAuthor?.username) {
      revalidatePath(`/@${postWithAuthor.username}/${postWithAuthor.slug}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Add comment error:", error);
    return { error: "Failed to add comment" };
  }
}

export async function deleteComment(commentId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Get the comment to check ownership
    const commentData = await db
      .select()
      .from(comment)
      .where(eq(comment.id, commentId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!commentData) {
      return { error: "Comment not found" };
    }

    // Check if user is comment author or post author
    const postData = await db
      .select({ authorId: post.authorId, slug: post.slug })
      .from(post)
      .where(eq(post.id, commentData.postId))
      .limit(1)
      .then((rows) => rows[0]);

    const isCommentAuthor = commentData.authorId === session.user.id;
    const isPostAuthor = postData?.authorId === session.user.id;

    if (!isCommentAuthor && !isPostAuthor) {
      return { error: "Unauthorized" };
    }

    await db.delete(comment).where(eq(comment.id, commentId));

    // Get post slug and author username in a single JOIN query
    const postWithAuthor = await db
      .select({
        slug: post.slug,
        username: user.username,
      })
      .from(post)
      .innerJoin(user, eq(post.authorId, user.id))
      .where(eq(post.id, commentData.postId))
      .limit(1)
      .then((rows) => rows[0]);

    if (postWithAuthor?.username) {
      revalidatePath(`/@${postWithAuthor.username}/${postWithAuthor.slug}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Delete comment error:", error);
    return { error: "Failed to delete comment" };
  }
}

export async function getComments(postId: string) {
  try {
    const result = await db
      .select({
        comment: comment,
        author: {
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
        },
      })
      .from(comment)
      .innerJoin(user, eq(comment.authorId, user.id))
      .where(eq(comment.postId, postId))
      .orderBy(comment.createdAt);

    return result;
  } catch (error) {
    console.error("Get comments error:", error);
    return [];
  }
}
