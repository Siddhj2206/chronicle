import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { bookmark, post } from "@/lib/db/schema";
import { postVisibility } from "@/lib/post-visibility";
import { getSession } from "@/lib/session";

export interface BookmarkViewer {
  userId: string | null;
  savedIds: string[] | null;
}

export async function getBookmarkViewer(): Promise<BookmarkViewer> {
  const session = await getSession();
  if (!session?.user?.id) return { userId: null, savedIds: [] };
  const userId = session.user.id;
  try {
    const db = await getDb();
    const rows = await db
      .select({ id: bookmark.postId })
      .from(bookmark)
      .innerJoin(post, eq(post.id, bookmark.postId))
      .where(and(eq(bookmark.userId, userId), postVisibility(userId)));
    return { userId, savedIds: rows.map((row) => row.id) };
  } catch (error) {
    console.error("Bookmark status lookup error:", error);
    return { userId, savedIds: null };
  }
}
