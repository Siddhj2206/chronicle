import { asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { postTag, tag } from "@/lib/db/schema";

import type { Post, Tag } from "@/lib/db/schema";

type Transaction = Parameters<
  Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]
>[0];

export async function replacePostTags(
  tx: Transaction,
  postId: string,
  tags: { name: string; slug: string }[],
): Promise<void> {
  await tx.delete(postTag).where(eq(postTag.postId, postId));
  for (const value of tags) {
    await tx
      .insert(tag)
      .values(value)
      .onConflictDoNothing({ target: tag.slug });
    const [stored] = await tx
      .select()
      .from(tag)
      .where(eq(tag.slug, value.slug));
    await tx.insert(postTag).values({ postId, tagId: stored.id });
  }
}

export async function withPostTags<T extends { post: Post }>(
  rows: T[],
  options: { required?: boolean } = {},
): Promise<T[]> {
  if (!rows.length) return rows;
  const grouped = new Map<string, Tag[]>();
  try {
    const db = await getDb();
    const tags = await db
      .select({ postId: postTag.postId, tag })
      .from(postTag)
      .innerJoin(tag, eq(tag.id, postTag.tagId))
      .where(
        inArray(
          postTag.postId,
          rows.map(({ post }) => post.id),
        ),
      )
      .orderBy(asc(tag.name));
    for (const row of tags)
      grouped.set(row.postId, [...(grouped.get(row.postId) ?? []), row.tag]);
  } catch (error) {
    console.error("Post tags lookup error:", error);
    if (options.required) throw error;
  }
  return rows.map((row) => ({
    ...row,
    post: { ...row.post, tags: grouped.get(row.post.id) ?? [] },
  }));
}
