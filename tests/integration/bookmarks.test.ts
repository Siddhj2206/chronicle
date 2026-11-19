import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";

import { getSavedPosts, toggleBookmark } from "@/actions/bookmarks";
import { getBookmarkViewer } from "@/lib/bookmarks";
import { getDb } from "@/lib/db";
import { bookmark, post, user } from "@/lib/db/schema";
import { createPost, createUser, resetDatabase } from "@/tests/helpers/db";
import { mockSession } from "@/tests/helpers/session";

beforeEach(async () => {
  await resetDatabase();
  mockSession(null);
});
afterEach(() => vi.restoreAllMocks());

describe("reading lists", () => {
  it("requires authentication and keeps signed-out status lookups empty", async () => {
    expect(await toggleBookmark("story")).toEqual({ error: "Unauthorized" });
    expect(await getSavedPosts()).toEqual({ error: "Unauthorized" });
    expect(await getBookmarkViewer()).toEqual({ userId: null, savedIds: [] });
  });

  it("validates IDs and pagination, and returns an empty first page", async () => {
    mockSession(await createUser());
    for (const value of ["", " ", null, {}, ["id"], "x".repeat(201)]) {
      expect(await toggleBookmark(value)).toEqual({ error: "Invalid post" });
    }
    for (const page of [0, -1, 1.5, "no", Infinity, 1_000_001]) {
      expect(await getSavedPosts(page)).toEqual({ error: "Invalid page" });
    }
    expect(await getSavedPosts()).toEqual({
      posts: [],
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
    });
    expect(await toggleBookmark("unknown")).toEqual({
      error: "Post not found",
    });
  });

  it("saves, reports status, invalidates affected paths and removes a story", async () => {
    const db = await getDb();
    const writer = await createUser();
    const article = await createPost(writer.id);
    const reader = await createUser();
    mockSession(reader);
    expect(await toggleBookmark(article.id)).toEqual({
      success: true,
      saved: true,
    });
    expect(await getBookmarkViewer()).toEqual({
      userId: reader.id,
      savedIds: [article.id],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/library");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/@${writer.username}/${article.slug}`,
    );
    expect(await toggleBookmark(article.id)).toEqual({
      success: true,
      saved: false,
    });
    expect(await db.select().from(bookmark)).toEqual([]);
  });

  it("allows an author's own draft but rejects another author's draft", async () => {
    const writer = await createUser();
    const draft = await createPost(writer.id, { published: false });
    mockSession(await createUser());
    expect(await toggleBookmark(draft.id)).toEqual({ error: "Post not found" });
    mockSession(writer);
    expect(await toggleBookmark(draft.id)).toEqual({
      success: true,
      saved: true,
    });
    expect(await getBookmarkViewer()).toEqual({
      userId: writer.id,
      savedIds: [draft.id],
    });
    expect(await getSavedPosts()).toMatchObject({ posts: [], totalCount: 0 });
  });

  it("enforces uniqueness and cascades when either a reader or a post is deleted", async () => {
    const db = await getDb();
    const writer = await createUser();
    const article = await createPost(writer.id);
    const reader = await createUser();
    mockSession(reader);
    await toggleBookmark(article.id);
    await expect(
      db.insert(bookmark).values({ userId: reader.id, postId: article.id }),
    ).rejects.toThrow();
    await db.delete(user).where(eq(user.id, reader.id));
    expect(await db.select().from(bookmark)).toEqual([]);
    mockSession(writer);
    await toggleBookmark(article.id);
    await db.delete(post).where(eq(post.id, article.id));
    expect(await db.select().from(bookmark)).toEqual([]);
  });

  it("serializes simultaneous toggles without duplicate saves", async () => {
    const db = await getDb();
    const writer = await createUser();
    const article = await createPost(writer.id);
    mockSession(writer);
    const results = await Promise.all([
      toggleBookmark(article.id),
      toggleBookmark(article.id),
    ]);
    expect(results).toEqual(
      expect.arrayContaining([
        { success: true, saved: true },
        { success: true, saved: false },
      ]),
    );
    expect(await db.select().from(bookmark)).toEqual([]);
  });

  it("paginates the viewer's published stories by saved date, not publication date", async () => {
    const db = await getDb();
    const writer = await createUser();
    const reader = await createUser();
    const other = await createUser();
    const articles = [];
    for (let index = 0; index < 13; index++) {
      const article = await createPost(writer.id, {
        publishedAt: new Date(Date.UTC(2030, 0, 13 - index)),
      });
      articles.push(article);
      await db.insert(bookmark).values({
        userId: reader.id,
        postId: article.id,
        createdAt: new Date(Date.UTC(2025, 0, index + 1)),
      });
    }
    for (const authorId of [reader.id, writer.id]) {
      const draft = await createPost(authorId, { published: false });
      await db.insert(bookmark).values({ userId: reader.id, postId: draft.id });
    }
    await db
      .insert(bookmark)
      .values({ userId: other.id, postId: articles[0].id });
    mockSession(reader);
    const first = await getSavedPosts();
    const second = await getSavedPosts("2");
    if ("error" in first || "error" in second)
      throw new Error("Expected saved stories");
    expect(first).toMatchObject({
      totalCount: 13,
      totalPages: 2,
      currentPage: 1,
    });
    expect(first.posts.map((row) => row.id)).toEqual(
      articles
        .slice(1)
        .reverse()
        .map((row) => row.id),
    );
    expect(second.posts.map((row) => row.id)).toEqual([articles[0].id]);
    expect(second.posts[0].author.id).toBe(writer.id);
    expect(await getSavedPosts(999)).toMatchObject({ currentPage: 2 });
    const viewer = await getBookmarkViewer();
    expect(viewer.savedIds).toHaveLength(14);
  });

  it("uses post IDs as a deterministic tie-breaker and hides unpublished saved stories", async () => {
    const db = await getDb();
    const writer = await createUser();
    const reader = await createUser();
    for (const id of ["saved-a", "saved-b"]) {
      await createPost(writer.id, { id });
      await db.insert(bookmark).values({
        userId: reader.id,
        postId: id,
        createdAt: new Date("2025-01-01"),
      });
    }
    mockSession(reader);
    const result = await getSavedPosts();
    if ("error" in result) throw new Error(result.error);
    expect(result.posts.map((row) => row.id)).toEqual(["saved-b", "saved-a"]);
    await db
      .update(post)
      .set({ published: false })
      .where(eq(post.id, "saved-b"));
    expect(await getBookmarkViewer()).toEqual({
      userId: reader.id,
      savedIds: ["saved-a"],
    });
    expect(await getSavedPosts()).toMatchObject({ totalCount: 1 });
  });

  it("returns friendly database failures and marks unavailable status instead of pretending it is empty", async () => {
    const db = await getDb();
    const writer = await createUser();
    mockSession(writer);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(db, "transaction").mockRejectedValueOnce(
      new Error("database unavailable"),
    );
    expect(await toggleBookmark("story")).toEqual({
      error: "Could not update your reading list",
    });
    const select = vi.spyOn(db, "select");
    select.mockImplementationOnce(() => {
      throw new Error("database unavailable");
    });
    expect(await getSavedPosts()).toEqual({
      error: "Could not load your reading list",
    });
    select.mockImplementationOnce(() => {
      throw new Error("database unavailable");
    });
    expect(await getBookmarkViewer()).toEqual({
      userId: writer.id,
      savedIds: null,
    });
  });

  it("does not report a committed save as failed when cache invalidation is unavailable", async () => {
    const writer = await createUser();
    const article = await createPost(writer.id);
    mockSession(writer);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(revalidatePath).mockImplementationOnce(() => {
      throw new Error("cache unavailable");
    });
    expect(await toggleBookmark(article.id)).toEqual({
      success: true,
      saved: true,
    });
  });
});
