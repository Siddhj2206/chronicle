import { and, eq, or } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { post } from "@/lib/db/schema";
import { getSession } from "@/lib/session";

import type { SQL } from "drizzle-orm";

export function postVisibility(userId?: string): SQL {
  const published = eq(post.published, true);
  return userId ? or(published, eq(post.authorId, userId))! : published;
}

export async function getVisiblePost(postId: string): Promise<{ id: string } | null> {
  const db = await getDb();
  const session = await getSession();
  const [result] = await db
    .select({ id: post.id })
    .from(post)
    .where(and(eq(post.id, postId), postVisibility(session?.user?.id)))
    .limit(1);

  return result ?? null;
}
