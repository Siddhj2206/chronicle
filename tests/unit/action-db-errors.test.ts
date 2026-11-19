import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getComments } from "@/actions/comments";
import { getLikeCount } from "@/actions/likes";
import { getNewestPosts } from "@/actions/posts";
import { getAuthorsWithPosts, searchPosts } from "@/actions/search";
import { getDb } from "@/lib/db";

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));

beforeEach(() => {
  vi.mocked(getDb).mockRejectedValue(new Error("Connection failed"));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("database initialization failures", () => {
  it("returns the posts fallback", async () => {
    await expect(getNewestPosts()).resolves.toEqual([]);
  });

  it("returns the comments fallback", async () => {
    await expect(getComments("missing")).resolves.toEqual([]);
  });

  it("returns the like count fallback", async () => {
    await expect(getLikeCount("missing")).resolves.toBe(0);
  });

  it("returns the author filter fallback", async () => {
    await expect(getAuthorsWithPosts()).resolves.toEqual([]);
  });

  it("returns empty search results when both database attempts fail", async () => {
    await expect(searchPosts({ query: "chronicle" })).resolves.toEqual({
      posts: [], hasMore: false, nextCursor: null,
    });
    expect(getDb).toHaveBeenCalledTimes(2);
  });

  it("does not initialize the database for an empty search", async () => {
    await expect(searchPosts({ query: "" })).resolves.toEqual({
      posts: [], hasMore: false, nextCursor: null,
    });
    expect(getDb).not.toHaveBeenCalled();
  });
});
