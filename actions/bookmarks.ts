"use server";

import { revalidatePath } from "next/cache";

import { and, count, desc, eq, getTableColumns } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { bookmark, post, user } from "@/lib/db/schema";
import { postVisibility } from "@/lib/post-visibility";
import { revalidatePosts } from "@/lib/revalidate-posts";
import { getSession } from "@/lib/session";

import type { Post, User } from "@/lib/db/schema";

type ToggleBookmarkResult =
  | { success: true; saved: boolean }
  | { error: string };
type BookmarkMutation =
  | { error: string }
  | { saved: boolean; target: { id: string; slug: string; authorId: string } };
export interface SavedPostsPage {
  posts: (Post & {
    author: Pick<User, "id" | "name" | "username" | "image">;
  })[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const postIdSchema = z.string().trim().min(1).max(200);
const pageSchema = z.coerce.number().int().min(1).max(1_000_000);
const PAGE_SIZE = 12;

export async function toggleBookmark(
  input: unknown,
): Promise<ToggleBookmarkResult> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const parsed = postIdSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid post" };
  const userId = session.user.id;
  try {
    const db = await getDb();
    const result = await db.transaction(
      async (tx): Promise<BookmarkMutation> => {
        const [viewer] = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, userId))
          .for("update");
        if (!viewer) return { error: "Unauthorized" };
        const [target] = await tx
          .select({ id: post.id, slug: post.slug, authorId: post.authorId })
          .from(post)
          .where(and(eq(post.id, parsed.data), postVisibility(userId)))
          .limit(1);
        if (!target) return { error: "Post not found" };
        const key = and(
          eq(bookmark.userId, userId),
          eq(bookmark.postId, target.id),
        );
        const [existing] = await tx
          .select({ id: bookmark.postId })
          .from(bookmark)
          .where(key);
        if (existing) await tx.delete(bookmark).where(key);
        else await tx.insert(bookmark).values({ userId, postId: target.id });
        return { saved: !existing, target };
      },
    );
    if ("error" in result) return { error: result.error };
    try {
      revalidatePath("/library");
      await revalidatePosts(result.target.authorId, { posts: [result.target] });
    } catch (error) {
      console.error("Reading list cache invalidation error:", error);
    }
    return { success: true, saved: result.saved };
  } catch (error) {
    console.error("Bookmark toggle error:", error);
    return { error: "Could not update your reading list" };
  }
}

export async function getSavedPosts(
  page: unknown = 1,
): Promise<SavedPostsPage | { error: string }> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const parsed = pageSchema.safeParse(page);
  if (!parsed.success) return { error: "Invalid page" };
  try {
    const db = await getDb();
    const visible = and(
      eq(bookmark.userId, session.user.id),
      eq(post.published, true),
    );
    const [total] = await db
      .select({ count: count() })
      .from(bookmark)
      .innerJoin(post, eq(post.id, bookmark.postId))
      .where(visible);
    const totalCount = total.count;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const currentPage = Math.min(parsed.data, totalPages);
    const posts = await db
      .select({
        ...getTableColumns(post),
        author: {
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
        },
      })
      .from(bookmark)
      .innerJoin(post, eq(post.id, bookmark.postId))
      .innerJoin(user, eq(user.id, post.authorId))
      .where(visible)
      .orderBy(desc(bookmark.createdAt), desc(bookmark.postId))
      .limit(PAGE_SIZE)
      .offset((currentPage - 1) * PAGE_SIZE);
    return { posts, totalCount, totalPages, currentPage };
  } catch (error) {
    console.error("Reading list query error:", error);
    return { error: "Could not load your reading list" };
  }
}
