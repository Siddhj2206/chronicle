"use server";

import { and, asc, count, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { post, postTag, tag, user } from "@/lib/db/schema";
import { withPostTags } from "@/lib/post-tags";
import { withResponseCounts } from "@/lib/response-counts";
import { postVisibility } from "@/lib/post-visibility";
import { getSession } from "@/lib/session";

import type { Tag } from "@/lib/db/schema";

export async function getTagsWithPosts(): Promise<
  Pick<Tag, "name" | "slug">[]
> {
  try {
    const db = await getDb();
    return await db
      .selectDistinct({ name: tag.name, slug: tag.slug })
      .from(tag)
      .innerJoin(postTag, eq(postTag.tagId, tag.id))
      .innerJoin(post, eq(post.id, postTag.postId))
      .where(eq(post.published, true))
      .orderBy(asc(tag.name));
  } catch (error) {
    console.error("Tag filter lookup error:", error);
    return [];
  }
}

export async function suggestTags(query: string = ""): Promise<Tag[]> {
  const parsed = z.string().trim().max(50).safeParse(query);
  if (!parsed.success) return [];
  try {
    const session = await getSession();
    const db = await getDb();
    return await db
      .selectDistinct({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        createdAt: tag.createdAt,
      })
      .from(tag)
      .innerJoin(postTag, eq(postTag.tagId, tag.id))
      .innerJoin(post, eq(post.id, postTag.postId))
      .where(
        and(
          ilike(tag.name, `${parsed.data.replace(/[\\%_]/g, "\\$&")}%`),
          postVisibility(session?.user?.id),
        ),
      )
      .orderBy(asc(tag.name))
      .limit(20);
  } catch (error) {
    console.error("Tag suggestions error:", error);
    return [];
  }
}

export async function getTagPosts(slug: string, page = 1, limit = 10) {
  const parsed = z
    .object({
      slug: z.string().min(1).max(200),
      page: z.number().int().min(1).max(100000),
      limit: z.number().int().min(1).max(50),
    })
    .safeParse({ slug, page, limit });
  if (!parsed.success) return { error: "Invalid tag query" } as const;
  try {
    const db = await getDb();
    const [topic] = await db
      .selectDistinct({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        createdAt: tag.createdAt,
      })
      .from(tag)
      .innerJoin(postTag, eq(postTag.tagId, tag.id))
      .innerJoin(post, eq(post.id, postTag.postId))
      .where(and(eq(tag.slug, slug), eq(post.published, true)))
      .limit(1);
    if (!topic) return null;
    const predicate = and(
      eq(postTag.tagId, topic.id),
      eq(post.published, true),
    );
    const [[total], rows] = await Promise.all([
      db
        .select({ count: count() })
        .from(post)
        .innerJoin(postTag, eq(postTag.postId, post.id))
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
        .innerJoin(postTag, eq(postTag.postId, post.id))
        .innerJoin(user, eq(user.id, post.authorId))
        .where(predicate)
        .orderBy(desc(post.publishedAt), desc(post.id))
        .limit(limit)
        .offset((page - 1) * limit),
    ]);
    if (!total.count) return null;
    return {
      tag: topic,
      posts: await withResponseCounts(await withPostTags(rows)),
      totalCount: total.count,
      totalPages: Math.ceil(total.count / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error("Tag stories error:", error);
    return { error: "Unable to load stories" } as const;
  }
}
