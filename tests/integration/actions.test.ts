import { beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

import { addComment, deleteComment, getComments } from "@/actions/comments";
import { getLikeCount, hasUserLiked, toggleLike } from "@/actions/likes";
import { createPost, deletePost, publishPost, updatePost } from "@/actions/posts";
import { searchPosts } from "@/actions/search";
import { setUsername, updateProfile } from "@/actions/users";
import { getDb } from "@/lib/db";
import { uploadContent } from "@/lib/r2-content";
import { createPost as seedPost, createUser, formData, resetDatabase } from "@/tests/helpers/db";
import { mockSession } from "@/tests/helpers/session";

const validPost = () => formData({ title: "Testing Chronicle", content: "Useful article body" });

beforeEach(async () => {
  await resetDatabase();
  mockSession(null);
});

describe("posts", () => {
  it("requires authentication for all mutations", async () => {
    expect(await createPost(validPost())).toEqual({ error: "Unauthorized" });
    expect(await updatePost("missing", validPost())).toEqual({ error: "Unauthorized" });
    expect(await publishPost("missing")).toEqual({ error: "Unauthorized" });
    expect(await deletePost("missing")).toEqual({ error: "Unauthorized" });
    expect(uploadContent).not.toHaveBeenCalled();
  });

  it("prevents editing, publishing or deleting another author's post", async () => {
    const db = await getDb();
    const owner = await createUser();
    const article = await seedPost(owner.id);
    mockSession(await createUser());
    expect(await updatePost(article.slug, validPost())).toEqual({ error: "Post not found" });
    expect(await publishPost(article.slug)).toEqual({ error: "Post not found" });
    expect(await deletePost(article.slug)).toEqual({ error: "Post not found" });
    expect(await db.query.post.findFirst()).toMatchObject({ id: article.id });
  });

  it("creates a draft, updates, publishes and deletes it", async () => {
    const db = await getDb();
    const owner = await createUser();
    mockSession(owner);
    const result = await createPost(validPost());
    expect(result).toMatchObject({ success: true, slug: "testing-chronicle" });
    expect(await db.query.post.findFirst()).toMatchObject({ authorId: owner.id, published: false });
    expect(await updatePost(result.slug!, formData({ title: "Updated", content: "New body" }))).toMatchObject({ success: true });
    expect(await db.query.post.findFirst()).toMatchObject({ title: "Updated", content: "New body" });
    expect(await publishPost(result.slug!)).toEqual({ success: true });
    expect(await db.query.post.findFirst()).toMatchObject({ published: true, publishedAt: expect.any(Date) });
    expect(await deletePost(result.slug!)).toEqual({ success: true });
    expect(await db.query.post.findMany()).toEqual([]);
  });

  it("rejects empty input and reports storage errors without inserting a post", async () => {
    const db = await getDb();
    mockSession(await createUser());
    expect(await createPost(formData({ title: "", content: "" }))).toHaveProperty("error");
    vi.mocked(uploadContent).mockRejectedValueOnce(new Error("Storage unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await createPost(validPost())).toEqual({ error: "Failed to create post" });
    expect(await db.query.post.findMany()).toEqual([]);
    log.mockRestore();
  });

  it("retries a raced slug conflict using pg constraint metadata", async () => {
    mockSession(await createUser());
    let uploads = 0;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { release = resolve; });
    await vi.mocked(uploadContent).withImplementation(async (id: string) => {
      if (++uploads === 2) release();
      await ready;
      return `content/${id}.md`;
    }, async () => {
      const results = await Promise.all([createPost(validPost()), createPost(validPost())]);
      expect(results.every((result) => result.success)).toBe(true);
      expect(results.map((result) => result.slug).sort()).toEqual(["testing-chronicle", "testing-chronicle-2"]);
    });
  });
});

describe("comments and likes", () => {
  it("requires authentication", async () => {
    expect(await addComment("missing", formData({ content: "Hello" }))).toEqual({ error: "Unauthorized" });
    expect(await deleteComment("missing")).toEqual({ error: "Unauthorized" });
    expect(await toggleLike("missing")).toEqual({ error: "Unauthorized" });
    expect(await hasUserLiked("missing")).toBe(false);
  });

  it("adds, reads and deletes a comment, rejecting empty content and non-owners", async () => {
    const owner = await createUser();
    const article = await seedPost(owner.id);
    expect(await getComments(article.id)).toEqual([]);
    mockSession(owner);
    expect(await addComment(article.id, formData({ content: "" }))).toHaveProperty("error");
    expect(await addComment(article.id, formData({ content: "Great story" }))).toEqual({ success: true });
    const comments = await getComments(article.id);
    expect(comments).toHaveLength(1);
    expect(comments[0].comment.content).toBe("Great story");
    mockSession(await createUser());
    expect(await deleteComment(comments[0].comment.id)).toEqual({ error: "Unauthorized" });
    mockSession(owner);
    expect(await deleteComment(comments[0].comment.id)).toEqual({ success: true });
    expect(await getComments(article.id)).toEqual([]);
    expect(await deleteComment("missing")).toEqual({ error: "Comment not found" });
  });

  it("toggles a like on and off in the database", async () => {
    const owner = await createUser();
    const article = await seedPost(owner.id);
    mockSession(owner);
    expect(await getLikeCount(article.id)).toBe(0);
    expect(await toggleLike(article.id)).toEqual({ success: true, liked: true });
    expect(await hasUserLiked(article.id)).toBe(true);
    expect(await getLikeCount(article.id)).toBe(1);
    expect(await toggleLike(article.id)).toEqual({ success: true, liked: false });
    expect(await hasUserLiked(article.id)).toBe(false);
    expect(await getLikeCount(article.id)).toBe(0);
  });
});

describe("search and profiles", () => {
  it("reports a raced username conflict using pg constraint metadata", async () => {
    const db = await getDb();
    await createUser({ username: "taken_name" });
    mockSession(await createUser());
    const lookup = vi.spyOn(db.query.user, "findFirst").mockResolvedValueOnce(undefined);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await setUsername("taken_name")).toEqual({ success: false, error: "Username is already taken" });
    } finally {
      lookup.mockRestore();
      log.mockRestore();
    }
  });

  it("preserves pg execute rows and timestamp values", async () => {
    const db = await getDb();
    const owner = await createUser();
    const article = await seedPost(owner.id);
    expect(article.publishedAt).toEqual(new Date("2025-01-02T00:00:00.000Z"));
    const result = await db.execute<{ id: string }>(sql`select ${article.id}::text as id`);
    expect(result.rows).toEqual([{ id: article.id }]);
  });

  it("finds published content with a basic query and handles empty and unmatched queries", async () => {
    const owner = await createUser();
    const article = await seedPost(owner.id, { title: "Astronomy journal" });
    await seedPost(owner.id, { title: "Astronomy draft", published: false });
    const result = await searchPosts({ query: "astronomy" });
    expect(result.posts.map(({ post }) => post.id)).toEqual([article.id]);
    expect(result.hasMore).toBe(false);
    expect(await searchPosts({ query: " " })).toEqual({ posts: [], hasMore: false, nextCursor: null });
    expect((await searchPosts({ query: "unmatchedword" })).posts).toEqual([]);
  });

  it("validates profile updates and persists valid changes", async () => {
    const db = await getDb();
    expect(await updateProfile(formData({ name: "Reader" }))).toEqual({ success: false, error: "Unauthorized" });
    mockSession(await createUser());
    const invalidProfiles: Record<string, string>[] = [{ name: "" }, { name: "Reader", username: "admin" }, { name: "Reader", bio: "x".repeat(501) }];
    for (const values of invalidProfiles) {
      expect(await updateProfile(formData(values))).toMatchObject({ success: false, error: expect.any(String) });
    }
    expect(await updateProfile(formData({ name: "New Name", bio: "Writer bio" }))).toEqual({ success: true });
    expect(await db.query.user.findFirst()).toMatchObject({ name: "New Name", bio: "Writer bio" });
  });
});
