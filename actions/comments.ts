"use server";

import { revalidatePath } from "next/cache";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { comment, post, user } from "@/lib/db/schema";
import { getVisiblePost, postVisibility } from "@/lib/post-visibility";
import { revalidatePosts } from "@/lib/revalidate-posts";
import { getSession } from "@/lib/session";
import { commentSchema } from "@/lib/validators";

import type { Comment, User } from "@/lib/db/schema";

type MutationResult =
  | { success: true; error?: never }
  | { error: string; success?: never };
type AuthorLikeResult =
  | { success: true; likedByAuthor: boolean; error?: never }
  | { error: string; success?: never; likedByAuthor?: never };
export interface ResponseWithAuthor {
  comment: Comment;
  author: Pick<User, "id" | "name" | "username" | "image">;
}

const idSchema = z.string().trim().min(1).max(200);
const responseSchema = commentSchema.extend({
  postId: idSchema,
  parentId: idSchema.nullable(),
});

async function refreshResponses(article: {
  id: string;
  slug: string;
  authorId: string;
}): Promise<void> {
  try {
    await revalidatePosts(article.authorId, { posts: [article] });
    revalidatePath("/archive");
    revalidatePath("/search");
  } catch (error) {
    console.error("Response cache invalidation error:", error);
  }
}

async function saveResponse(
  postId: unknown,
  parentId: unknown,
  formData: FormData,
): Promise<MutationResult> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const content =
    formData instanceof FormData ? formData.get("content") : undefined;
  const parsed = responseSchema.safeParse({
    postId,
    parentId,
    content: typeof content === "string" ? content.trim() : content,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const db = await getDb();
    const result = await db.transaction(async (tx) => {
      const [article] = await tx
        .select()
        .from(post)
        .where(
          and(eq(post.id, parsed.data.postId), postVisibility(session.user.id)),
        )
        .limit(1);
      if (!article) return { error: "Post not found" };
      let rootId: string | null = null;
      if (parsed.data.parentId !== null) {
        const [target] = await tx
          .select()
          .from(comment)
          .where(
            and(
              eq(comment.id, parsed.data.parentId),
              eq(comment.postId, article.id),
            ),
          )
          .limit(1);
        if (!target) return { error: "Response not found" };
        rootId = target.parentId ?? target.id;
        const [root] = await tx
          .select({ id: comment.id })
          .from(comment)
          .where(
            and(
              eq(comment.id, rootId),
              eq(comment.postId, article.id),
              isNull(comment.parentId),
            ),
          )
          .limit(1);
        if (!root) return { error: "Response not found" };
      }
      await tx.insert(comment).values({
        postId: article.id,
        authorId: session.user.id,
        content: parsed.data.content,
        parentId: rootId,
      });
      return { article };
    });
    if ("error" in result) return { error: result.error! };
    await refreshResponses(result.article);
    return { success: true };
  } catch (error) {
    console.error("Add comment error:", error);
    return { error: "Failed to add comment" };
  }
}

export async function addComment(
  postId: unknown,
  formData: FormData,
): Promise<MutationResult> {
  return saveResponse(postId, null, formData);
}

export async function replyToComment(
  postId: unknown,
  parentId: unknown,
  formData: FormData,
): Promise<MutationResult> {
  return saveResponse(
    postId,
    parentId === null ? undefined : parentId,
    formData,
  );
}

export async function deleteComment(
  commentId: unknown,
): Promise<MutationResult> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const parsed = idSchema.safeParse(commentId);
  if (!parsed.success) return { error: "Invalid response" };
  try {
    const db = await getDb();
    const [target] = await db
      .select({ response: comment, article: post })
      .from(comment)
      .innerJoin(post, eq(comment.postId, post.id))
      .where(and(eq(comment.id, parsed.data), postVisibility(session.user.id)))
      .limit(1);
    if (!target) return { error: "Comment not found" };
    if (
      target.response.authorId !== session.user.id &&
      target.article.authorId !== session.user.id
    )
      return { error: "Unauthorized" };
    await db.delete(comment).where(eq(comment.id, parsed.data));
    await refreshResponses(target.article);
    return { success: true };
  } catch (error) {
    console.error("Delete comment error:", error);
    return { error: "Failed to delete comment" };
  }
}

export async function toggleAuthorLike(
  commentId: unknown,
): Promise<AuthorLikeResult> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const parsed = idSchema.safeParse(commentId);
  if (!parsed.success) return { error: "Invalid response" };
  try {
    const db = await getDb();
    const [target] = await db
      .select({ article: post })
      .from(comment)
      .innerJoin(post, eq(comment.postId, post.id))
      .where(and(eq(comment.id, parsed.data), postVisibility(session.user.id)))
      .limit(1);
    if (!target) return { error: "Response not found" };
    if (target.article.authorId !== session.user.id)
      return { error: "Unauthorized" };
    const [updated] = await db
      .update(comment)
      .set({ likedByAuthor: sql`not ${comment.likedByAuthor}` })
      .where(eq(comment.id, parsed.data))
      .returning({ likedByAuthor: comment.likedByAuthor });
    if (!updated) return { error: "Response not found" };
    await refreshResponses(target.article);
    return { success: true, likedByAuthor: updated.likedByAuthor };
  } catch (error) {
    console.error("Author response like error:", error);
    return { error: "Failed to update response" };
  }
}

export async function getComments(
  postId: string,
): Promise<ResponseWithAuthor[]> {
  try {
    const db = await getDb();
    if (!(await getVisiblePost(postId))) return [];
    return await db
      .select({
        comment,
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
      .orderBy(asc(comment.createdAt), asc(comment.id));
  } catch (error) {
    console.error("Get comments error:", error);
    return [];
  }
}
