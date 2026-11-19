import { beforeEach, describe, expect, it, vi } from "vitest";

import { eq } from "drizzle-orm";

import {
  getFollowInfo,
  getFollowingPosts,
  toggleFollow,
} from "@/actions/follows";
import { getDb } from "@/lib/db";
import { follow, user } from "@/lib/db/schema";
import { createPost, createUser, resetDatabase } from "@/tests/helpers/db";
import { mockSession } from "@/tests/helpers/session";

let db: Awaited<ReturnType<typeof getDb>>;

beforeEach(async () => {
  await resetDatabase();
  db = await getDb();
  mockSession(null);
});

describe("following authors", () => {
  it("requires a session and validates targets", async () => {
    expect(await toggleFollow("missing")).toEqual({ error: "Unauthorized" });
    expect(await getFollowingPosts()).toEqual({ error: "Unauthorized" });
    const reader = await createUser();
    mockSession(reader);
    expect(await toggleFollow("")).toEqual({ error: "Invalid author" });
    expect(await toggleFollow("missing")).toEqual({
      error: "Author not found",
    });
    expect(await toggleFollow(reader.id)).toEqual({
      error: "You cannot follow yourself",
    });
    expect(await db.select().from(follow)).toEqual([]);
    expect(await getFollowingPosts({ page: 0 })).toEqual({
      error: "Invalid pagination",
    });
    expect(await getFollowingPosts({ limit: 51 })).toEqual({
      error: "Invalid pagination",
    });
  });

  it("follows and unfollows, updating counts in both directions", async () => {
    const reader = await createUser();
    const writer = await createUser();
    expect(await getFollowInfo(writer.id)).toMatchObject({
      followers: 0,
      following: 0,
      isFollowing: false,
      viewerId: null,
    });
    mockSession(reader);
    expect(await toggleFollow(writer.id)).toEqual({
      success: true,
      following: true,
    });
    expect(await getFollowInfo(writer.id)).toMatchObject({
      followers: 1,
      following: 0,
      isFollowing: true,
      viewerId: reader.id,
    });
    expect(await getFollowInfo(reader.id)).toMatchObject({
      followers: 0,
      following: 1,
    });
    expect(await toggleFollow(writer.id)).toEqual({
      success: true,
      following: false,
    });
    expect(await getFollowInfo(writer.id)).toMatchObject({
      followers: 0,
      isFollowing: false,
    });
    expect(await getFollowInfo(reader.id)).toMatchObject({ following: 0 });
  });

  it("enforces no self-follow and unique relationships in the database", async () => {
    const reader = await createUser();
    const writer = await createUser();
    await expect(
      db
        .insert(follow)
        .values({ followerId: reader.id, followingId: reader.id }),
    ).rejects.toThrow();
    await db
      .insert(follow)
      .values({ followerId: reader.id, followingId: writer.id });
    await expect(
      db
        .insert(follow)
        .values({ followerId: reader.id, followingId: writer.id }),
    ).rejects.toThrow();
    await db.delete(user).where(eq(user.id, writer.id));
    expect(await db.select().from(follow)).toEqual([]);
    const nextWriter = await createUser();
    await db
      .insert(follow)
      .values({ followerId: reader.id, followingId: nextWriter.id });
    await db.delete(user).where(eq(user.id, reader.id));
    expect(await db.select().from(follow)).toEqual([]);
  });

  it("paginates only published stories by followed authors, newest first", async () => {
    const reader = await createUser();
    const writer = await createUser();
    const other = await createUser();
    const older = await createPost(writer.id, {
      publishedAt: new Date("2025-01-01"),
    });
    const newer = await createPost(writer.id, {
      publishedAt: new Date("2025-02-01"),
    });
    await createPost(writer.id, { published: false });
    await createPost(other.id);
    await createPost(reader.id);
    mockSession(reader);
    expect(await getFollowingPosts()).toMatchObject({
      posts: [],
      totalCount: 0,
      totalPages: 0,
    });
    await toggleFollow(writer.id);
    const first = await getFollowingPosts({ limit: 1 });
    expect(first).toMatchObject({
      posts: [{ post: { id: newer.id }, author: { id: writer.id } }],
      totalCount: 2,
      totalPages: 2,
      currentPage: 1,
    });
    expect(await getFollowingPosts({ page: 2, limit: 1 })).toMatchObject({
      posts: [{ post: { id: older.id } }],
    });
    expect(await getFollowingPosts({ page: 3, limit: 1 })).toMatchObject({
      posts: [],
    });
    mockSession(other);
    expect(await getFollowingPosts()).toMatchObject({
      posts: [],
      totalCount: 0,
    });
    mockSession(reader);
    await toggleFollow(writer.id);
    expect(await getFollowingPosts()).toMatchObject({
      posts: [],
      totalCount: 0,
    });
  });

  it("returns a friendly error when a follow cannot be stored", async () => {
    const reader = await createUser();
    const writer = await createUser();
    mockSession(reader);
    const transaction = vi
      .spyOn(db, "transaction")
      .mockRejectedValueOnce(new Error("Database unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await toggleFollow(writer.id)).toEqual({
      error: "Failed to update follow",
    });
    expect(await db.select().from(follow)).toEqual([]);
    transaction.mockRestore();
    log.mockRestore();
  });
});
