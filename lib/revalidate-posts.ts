import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { post, user } from "@/lib/db/schema";
import { revalidateContent } from "@/lib/r2-content";

interface RevalidatePostsOptions {
  posts?: { id: string; slug: string }[];
  usernames?: string[];
  contentChanged?: boolean;
}

export async function revalidatePosts(
  authorId: string,
  options: RevalidatePostsOptions = {},
): Promise<void> {
  try {
    const db = await getDb();
    const [author] = await db
      .select({ username: user.username })
      .from(user)
      .where(eq(user.id, authorId))
      .limit(1);
    const posts =
      options.posts ??
      (await db
        .select({ id: post.id, slug: post.slug })
        .from(post)
        .where(eq(post.authorId, authorId)));
    const usernames = new Set(options.usernames);
    if (author?.username) usernames.add(author.username);

    for (const path of ["/", "/manuscripts", "/settings"]) revalidatePath(path);
    for (const username of usernames) {
      revalidatePath(`/@${username}`);
      for (const post of posts) revalidatePath(`/@${username}/${post.slug}`);
    }
    if (options.contentChanged) {
      for (const post of posts) await revalidateContent(post.id);
    }
  } catch (error) {
    console.error("Post cache invalidation error:", error);
  }
}
