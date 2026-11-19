import { beforeEach, describe, expect, it, vi } from "vitest";

import { eq } from "drizzle-orm";

import { createPost, getPost, getPostForEditWithContent, publishPost, updatePost } from "@/actions/posts";
import { getTagPosts, getTagsWithPosts, suggestTags } from "@/actions/tags";
import { searchPosts } from "@/actions/search";
import { db } from "@/lib/db";
import { post, postTag, tag } from "@/lib/db/schema";
import { createUser, resetDatabase } from "@/tests/helpers/db";
import { mockSession } from "@/tests/helpers/session";
import * as tagStorage from "@/lib/post-tags";

function data(tags: string[] = []) {
  const form = new FormData();
  form.set("title", "Thoughtful gardens");
  form.set("content", "Stories about gardens and communities.");
  tags.forEach((name) => form.append("tags", name));
  return form;
}

beforeEach(async () => {
  await resetDatabase();
  await db.delete(tag);
  mockSession(null);
});

describe("post topics", () => {
  it("normalizes, deduplicates and replaces tags, including the empty set", async () => {
    const writer = await createUser();
    mockSession(writer);
    const created = await createPost(data(["  Café Life  ", "cafe-life", "Gardens"]));
    expect(created).toHaveProperty("success", true);
    const slug = created.slug!;
    const edited = await getPostForEditWithContent(slug);
    expect(edited?.post.tags?.map((tag) => tag.slug).sort()).toEqual(["cafe-life", "gardens"]);
    expect(await suggestTags("Gar")).toMatchObject([{ name: "Gardens" }]);
    expect(await suggestTags("%" )).toEqual([]);
    expect(await updatePost(slug, data(["Science"]))).toHaveProperty("success", true);
    expect((await getPostForEditWithContent(slug))?.post.tags?.map((tag) => tag.slug)).toEqual(["science"]);
    expect(await updatePost(slug, data())).toHaveProperty("success", true);
    expect((await getPostForEditWithContent(slug))?.post.tags).toEqual([]);
    expect(await db.select().from(postTag)).toEqual([]);
  });

  it("validates limits, rejects invalid tags and protects mutations", async () => {
    expect(await createPost(data(["Science"]))).toEqual({ error: "Unauthorized" });
    const writer = await createUser();
    mockSession(writer);
    for (const names of [["1", "2", "3", "4", "5", "6"], ["!!!"], ["x".repeat(51)], [""]]) {
      expect(await createPost(data(names))).toHaveProperty("error");
    }
    expect(await db.select().from(post)).toEqual([]);
    const created = await createPost(data(["Science"]));
    expect(await getTagsWithPosts()).toEqual([]);
    mockSession(await createUser());
    expect(await updatePost(created.slug!, data(["Other"]))).toHaveProperty("error");
    expect((await db.select().from(tag)).map((tag) => tag.slug)).toEqual(["science"]);
  });

  it("lists only published tagged posts and combines search with tag filtering", async () => {
    const writer = await createUser();
    mockSession(writer);
    const first = await createPost(data(["Gardens"]));
    const second = await createPost(data(["Gardens", "Science"]));
    await createPost(data(["Gardens"]));
    const other = await createPost(data(["Other"]));
    for (const slug of [first.slug!, second.slug!, other.slug!]) await publishPost(slug);
    expect((await getTagsWithPosts()).map((tag) => tag.slug).sort()).toEqual(["gardens", "other", "science"]);
    mockSession(null);
    const result = await getTagPosts("gardens", 1, 1);
    expect(result).toMatchObject({ totalCount: 2, totalPages: 2, posts: [{ post: { slug: second.slug } }] });
    expect(await getTagPosts("gardens", 2, 1)).toMatchObject({ posts: [{ post: { slug: first.slug } }] });
    expect(await getTagPosts("gardens", 3, 1)).toMatchObject({ posts: [] });
    expect(await getTagPosts("missing")).toBeNull();
    expect(await getTagPosts("gardens", 0)).toHaveProperty("error");
    expect((await searchPosts({ query: "gardens", tag: "science" })).posts.map(({ post }) => post.slug)).toEqual([second.slug]);
    const search = await searchPosts({ query: "gardens", tag: "gardens", author: writer.username!, limit: 1 });
    expect(search.hasMore).toBe(true);
    expect((await searchPosts({ query: "gardens", tag: "gardens", author: writer.username!, limit: 1, cursor: search.nextCursor! })).posts).toHaveLength(1);
    expect((await searchPosts({ query: "gardens", tag: "missing" })).posts).toEqual([]);
    expect((await getPost(writer.username!, second.slug!))?.post.tags).toHaveLength(2);
    await db.delete(post).where(eq(post.slug, second.slug!));
    expect(await getTagPosts("science")).toMatchObject({ posts: [], totalCount: 0 });
  });

  it("rolls back post updates when tag storage fails", async () => {
    const writer = await createUser();
    mockSession(writer);
    const created = await createPost(data(["Gardens"]));
    const failure = vi.spyOn(tagStorage, "replacePostTags").mockRejectedValueOnce(new Error("Storage unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await updatePost(created.slug!, data(["Science"]))).toHaveProperty("error");
    failure.mockRestore();
    expect((await getPostForEditWithContent(created.slug!))?.post.tags?.map((tag) => tag.slug)).toEqual(["gardens"]);
    const query = vi.spyOn(db, "select").mockImplementationOnce(() => { throw new Error("Unavailable"); });
    expect(await getTagPosts("gardens")).toHaveProperty("error");
    query.mockRestore();
    log.mockRestore();
  });
});
