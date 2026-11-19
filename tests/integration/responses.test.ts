import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  addComment,
  deleteComment,
  getComments,
  replyToComment,
  toggleAuthorLike,
} from "@/actions/comments";
import {
  getAllPosts,
  getNewestPosts,
  getPost,
  getPostsByUser,
  getTrendingPosts,
} from "@/actions/posts";
import { searchPosts } from "@/actions/search";
import { getDb } from "@/lib/db";
import { comment } from "@/lib/db/schema";
import { withResponseCounts } from "@/lib/response-counts";
import {
  createPost,
  createUser,
  formData,
  resetDatabase,
} from "@/tests/helpers/db";
import { mockSession } from "@/tests/helpers/session";

const body = (content = "A thoughtful response") => formData({ content });

beforeEach(async () => {
  await resetDatabase();
  mockSession(null);
});

async function fixture() {
  const owner = await createUser();
  const reader = await createUser();
  const article = await createPost(owner.id);
  mockSession(reader);
  await addComment(article.id, body());
  const [root] = await getComments(article.id);
  return { owner, reader, article, root: root.comment };
}

describe("threaded responses", () => {
  it("requires authentication and validates identifiers, content and reply targets", async () => {
    expect(await replyToComment("post", null, body())).toEqual({
      error: "Unauthorized",
    });
    expect(await toggleAuthorLike("root")).toEqual({ error: "Unauthorized" });
    const { article, root } = await fixture();
    for (const content of ["", "  ", "x".repeat(2001)])
      expect(
        await replyToComment(article.id, root.id, body(content)),
      ).toHaveProperty("error");
    for (const id of [null, {}, "", "x".repeat(201)]) {
      expect(await replyToComment(article.id, id, body())).toHaveProperty(
        "error",
      );
      expect(await toggleAuthorLike(id)).toHaveProperty("error");
    }
    expect(await replyToComment("missing", root.id, body())).toEqual({
      error: "Post not found",
    });
    expect(await replyToComment(article.id, "missing", body())).toEqual({
      error: "Response not found",
    });
    expect(await toggleAuthorLike("missing")).toEqual({
      error: "Response not found",
    });
    expect(await deleteComment({})).toEqual({ error: "Invalid response" });
    expect(await getComments(article.id)).toHaveLength(1);
  });

  it("flattens replies to replies onto the root, preserves order and defaults author likes to false", async () => {
    const { article, root } = await fixture();
    expect(root).toMatchObject({ parentId: null, likedByAuthor: false });
    expect(
      await replyToComment(article.id, root.id, body("First reply")),
    ).toEqual({ success: true });
    const first = (await getComments(article.id)).find(
      ({ comment }) => comment.content === "First reply",
    )!.comment;
    expect(
      await replyToComment(article.id, first.id, body("Reply to a reply")),
    ).toEqual({ success: true });
    const rows = await getComments(article.id);
    expect(rows.map(({ comment }) => comment.content)).toEqual([
      root.content,
      "First reply",
      "Reply to a reply",
    ]);
    expect(
      rows.slice(1).every(({ comment }) => comment.parentId === root.id),
    ).toBe(true);
    expect(rows.every(({ comment }) => !comment.likedByAuthor)).toBe(true);
    expect(
      await replyToComment(article.id, root.id, body("x".repeat(2000))),
    ).toEqual({ success: true });
  });

  it("rejects cross-post targets and other authors' drafts but permits the owner on a draft", async () => {
    const { article, root, owner } = await fixture();
    const other = await createPost(owner.id);
    expect(await replyToComment(other.id, root.id, body())).toEqual({
      error: "Response not found",
    });
    const draft = await createPost(owner.id, { published: false });
    const db = await getDb();
    const [draftRoot] = await db
      .insert(comment)
      .values({ postId: draft.id, authorId: owner.id, content: "Private" })
      .returning();
    expect(await replyToComment(draft.id, draftRoot.id, body())).toEqual({
      error: "Post not found",
    });
    expect(await toggleAuthorLike(draftRoot.id)).toEqual({
      error: "Response not found",
    });
    expect(await deleteComment(draftRoot.id)).toEqual({
      error: "Comment not found",
    });
    expect(await getComments(draft.id)).toEqual([]);
    mockSession(owner);
    expect(await replyToComment(draft.id, draftRoot.id, body())).toEqual({
      success: true,
    });
    expect(await toggleAuthorLike(draftRoot.id)).toMatchObject({
      success: true,
      likedByAuthor: true,
    });
    expect(await getComments(article.id)).toHaveLength(1);
  });

  it("only lets the post author endorse roots and replies; concurrent toggles are atomic", async () => {
    const { article, root, owner } = await fixture();
    expect(await toggleAuthorLike(root.id)).toEqual({ error: "Unauthorized" });
    await replyToComment(article.id, root.id, body("Reply"));
    const reply = (await getComments(article.id)).find(
      ({ comment }) => comment.parentId,
    )!.comment;
    mockSession(await createUser());
    expect(await toggleAuthorLike(reply.id)).toEqual({ error: "Unauthorized" });
    mockSession(owner);
    expect(await toggleAuthorLike(root.id)).toEqual({
      success: true,
      likedByAuthor: true,
    });
    expect(await toggleAuthorLike(root.id)).toEqual({
      success: true,
      likedByAuthor: false,
    });
    expect(await toggleAuthorLike(reply.id)).toEqual({
      success: true,
      likedByAuthor: true,
    });
    const results = await Promise.all([
      toggleAuthorLike(root.id),
      toggleAuthorLike(root.id),
    ]);
    expect(results.every(({ success }) => success)).toBe(true);
    expect(
      (await getComments(article.id)).find(
        ({ comment }) => comment.id === root.id,
      )!.comment.likedByAuthor,
    ).toBe(false);
  });

  it("allows reply deletion without removing the root; root deletion cascades and updates counts", async () => {
    const { article, root, owner, reader } = await fixture();
    await replyToComment(article.id, root.id, body("Reply"));
    let rows = await getComments(article.id);
    const reply = rows.find(({ comment }) => comment.parentId)!.comment;
    mockSession(await createUser());
    expect(await deleteComment(root.id)).toEqual({ error: "Unauthorized" });
    mockSession(reader);
    expect(await deleteComment(reply.id)).toEqual({ success: true });
    expect(await getComments(article.id)).toHaveLength(1);
    await replyToComment(article.id, root.id, body("Another reply"));
    mockSession(owner);
    expect(await deleteComment(root.id)).toEqual({ success: true });
    rows = await getComments(article.id);
    expect(rows).toEqual([]);
    expect((await getNewestPosts())[0].post.responseCount).toBe(0);
    const db = await getDb();
    expect(
      await db.select().from(comment).where(eq(comment.postId, article.id)),
    ).toEqual([]);
  });

  it("includes roots and replies in article, feed, profile, archive and search counts", async () => {
    const { article, root, owner } = await fixture();
    await replyToComment(article.id, root.id, body());
    await replyToComment(article.id, root.id, body());
    const empty = await createPost(owner.id, { title: "Another article" });
    for (const rows of [
      await getNewestPosts(),
      await getTrendingPosts(),
      await getPostsByUser(owner.username!),
      (await getAllPosts()).posts,
      (await searchPosts({ query: "Chronicle" })).posts,
    ]) {
      expect(
        rows.find(({ post }) => post.id === article.id)?.post,
      ).toMatchObject({ responseCount: 3 });
    }
    expect(
      (await getNewestPosts()).find(({ post }) => post.id === empty.id)?.post
        .responseCount,
    ).toBe(0);
    expect(
      (await getPost(owner.username!, article.slug))?.post.responseCount,
    ).toBe(3);
    expect(await withResponseCounts([])).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith("/archive");
    expect(revalidatePath).toHaveBeenCalledWith("/search");
  });

  it("reports write failures, degrades failed counts without inventing zero, and preserves committed mutations when invalidation fails", async () => {
    const { article, root, owner } = await fixture();
    const db = await getDb();
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const transaction = vi
        .spyOn(db, "transaction")
        .mockRejectedValueOnce(new Error("offline"));
      expect(await replyToComment(article.id, root.id, body())).toEqual({
        error: "Failed to add comment",
      });
      transaction.mockRestore();
      const select = vi.spyOn(db, "select").mockImplementationOnce(() => {
        throw new Error("offline");
      });
      expect(
        (await withResponseCounts([{ post: article }]))[0].post.responseCount,
      ).toBeUndefined();
      select.mockRestore();
      mockSession(owner);
      const update = vi.spyOn(db, "update").mockImplementationOnce(() => {
        throw new Error("offline");
      });
      expect(await toggleAuthorLike(root.id)).toEqual({
        error: "Failed to update response",
      });
      update.mockRestore();
      vi.mocked(revalidatePath).mockImplementationOnce(() => {
        throw new Error("cache offline");
      });
      expect(await toggleAuthorLike(root.id)).toEqual({
        success: true,
        likedByAuthor: true,
      });
      expect((await getComments(article.id))[0].comment.likedByAuthor).toBe(
        true,
      );
    } finally {
      vi.restoreAllMocks();
    }
  });
});
