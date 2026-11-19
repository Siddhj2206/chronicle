import { beforeEach, describe, expect, it, vi } from "vitest";

import { eq } from "drizzle-orm";

import { createPost, getNewestPosts, getPost, getPostForEditWithContent, getPostsByUser, getTrendingPosts, publishPost, unpublishPost, updatePost } from "@/actions/posts";
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
    expect(await getTagPosts("science")).toBeNull();
  });

  it("suggests only published topics or the current writer's draft topics", async () => {
    const writer = await createUser();
    const reader = await createUser();
    mockSession(writer);
    const draft = await createPost(data(["Secret plans"]));
    const published = await createPost(data(["Public gardens"]));
    await publishPost(published.slug!);
    await db.insert(tag).values({ name: "Unused", slug: "unused" });
    expect((await suggestTags()).map((tag) => tag.slug)).toEqual(["public-gardens", "secret-plans"]);
    expect(await getTagPosts("secret-plans")).toBeNull();
    mockSession(reader);
    expect((await suggestTags()).map((tag) => tag.slug)).toEqual(["public-gardens"]);
    mockSession(null);
    expect((await suggestTags()).map((tag) => tag.slug)).toEqual(["public-gardens"]);
    expect(await suggestTags("Secret")).toEqual([]);
    expect(await getTagPosts("secret-plans")).toBeNull();
    expect(await getTagPosts("unused")).toBeNull();
    mockSession(writer);
    await publishPost(draft.slug!);
    expect(await getTagPosts("secret-plans")).toMatchObject({ totalCount: 1 });
    await unpublishPost(draft.slug!);
    expect(await getTagPosts("secret-plans")).toBeNull();
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

  it("stores distinct programming topics and looks up published Unicode topics", async () => {
    const writer = await createUser();
    mockSession(writer);
    const created = await createPost(data(["C", "C++", "C#", "東京"]));
    expect(created).toHaveProperty("success", true);
    expect((await getPostForEditWithContent(created.slug!))?.post.tags?.map((tag) => tag.slug).sort())
      .toEqual(["c", "c-plus-plus", "c-sharp", "東京"]);
    await publishPost(created.slug!);
    mockSession(null);
    for (const slug of ["c", "c-plus-plus", "c-sharp", "東京"]) {
      expect(await getTagPosts(slug)).toMatchObject({ totalCount: 1, posts: [{ post: { slug: created.slug } }] });
    }
    expect(await suggestTags("東")).toMatchObject([{ name: "東京", slug: "東京" }]);
    expect((await searchPosts({ query: "gardens", tag: "東京" })).posts).toMatchObject([{ post: { slug: created.slug } }]);
  });

  it("keeps feed posts when tag enrichment fails, including every trending branch", async () => {
    expect(await tagStorage.withPostTags([])).toEqual([]);
    const writer = await createUser();
    mockSession(writer);
    const recent = await createPost(data(["Gardens"]));
    const older = await createPost(data(["Gardens"]));
    await publishPost(recent.slug!);
    await publishPost(older.slug!);
    await db.update(post).set({ publishedAt: new Date("2020-01-01") }).where(eq(post.slug, older.slug!));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const select = db.select.bind(db);
    const failure = new Error("Tag storage unavailable");
    try {
      for (const [query, baseQueries, expectedCount] of [
        [() => getNewestPosts(), 1, 2],
        [() => getPostsByUser(writer.username!), 1, 2],
        [() => getTrendingPosts(1), 1, 1],
        [() => getTrendingPosts(2), 2, 2],
        [() => getTrendingPosts(3), 2, 2],
      ] as const) {
        const lookup = vi.spyOn(db, "select");
        for (let index = 0; index < baseQueries; index++) lookup.mockImplementationOnce(select);
        lookup.mockImplementationOnce(() => { throw failure; });
        try {
          const rows = await query();
          expect(rows).toHaveLength(expectedCount);
          expect(rows.every(({ post }) => post.tags?.length === 0)).toBe(true);
          expect(log).toHaveBeenLastCalledWith("Post tags lookup error:", failure);
        } finally {
          lookup.mockRestore();
        }
      }
      await db.update(post).set({ publishedAt: new Date("2020-01-01") });
      const lookup = vi.spyOn(db, "select").mockImplementationOnce(select).mockImplementationOnce(select)
        .mockImplementationOnce(() => { throw failure; });
      try {
        expect(await getTrendingPosts(2)).toMatchObject([
          { post: { tags: [] } }, { post: { tags: [] } },
        ]);
      } finally {
        lookup.mockRestore();
      }
    } finally {
      log.mockRestore();
    }
  });
});
