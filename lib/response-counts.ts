import { count, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { comment } from "@/lib/db/schema";

export async function withResponseCounts<T extends { post: { id: string } }>(
  rows: T[],
): Promise<(T & { post: T["post"] & { responseCount?: number } })[]> {
  if (rows.length === 0) return [];
  try {
    const db = await getDb();
    const totals = await db
      .select({ postId: comment.postId, total: count() })
      .from(comment)
      .where(
        inArray(
          comment.postId,
          rows.map(({ post }) => post.id),
        ),
      )
      .groupBy(comment.postId);
    const counts = new Map(totals.map(({ postId, total }) => [postId, total]));
    return rows.map((row) => ({
      ...row,
      post: { ...row.post, responseCount: counts.get(row.post.id) ?? 0 },
    }));
  } catch (error) {
    console.error("Response count lookup error:", error);
    return rows.map((row) => ({
      ...row,
      post: { ...row.post, responseCount: undefined },
    }));
  }
}
