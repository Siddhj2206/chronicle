import { revalidatePath } from "next/cache";

import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { revalidatePosts } from "@/lib/revalidate-posts";
import { revalidateContent } from "@/lib/r2-content";

const { getDb, limit, where, from, select } = vi.hoisted(() => {
  const limit = vi.fn();
  const where = vi.fn();
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { getDb: vi.fn(), limit, where, from, select };
});
vi.mock("@/lib/db", () => ({ getDb }));

beforeEach(() => {
  getDb.mockReset().mockResolvedValue({ select });
  limit.mockReset().mockResolvedValue([{ username: "writer" }]);
  where.mockReset().mockImplementation(() =>
    Object.assign(Promise.resolve([{ id: "post-1", slug: "story" }]), {
      limit,
    }),
  );
  from.mockClear();
  select.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

it("invalidates listing, profile, old username and post paths plus content tags", async () => {
  await revalidatePosts("author-1", {
    usernames: ["old-writer"],
    contentChanged: true,
  });
  for (const path of [
    "/",
    "/manuscripts",
    "/settings",
    "/archive",
    "/search",
    "/@writer",
    "/@writer/story",
    "/@old-writer",
    "/@old-writer/story",
  ]) {
    expect(revalidatePath).toHaveBeenCalledWith(path);
  }
  expect(revalidatePath).toHaveBeenCalledWith("/tag/[slug]", "page");
  expect(revalidateContent).toHaveBeenCalledExactlyOnceWith("post-1");
});

it("does not invalidate content for a metadata-only change", async () => {
  await revalidatePosts("author-1", {
    posts: [{ id: "post-1", slug: "story" }],
  });
  expect(revalidatePath).toHaveBeenCalledWith("/@writer/story");
  expect(revalidateContent).not.toHaveBeenCalled();
  expect(select).toHaveBeenCalledTimes(1);
});

it("handles an empty author and post set", async () => {
  limit.mockResolvedValueOnce([]);
  await revalidatePosts("missing", { posts: [], contentChanged: true });
  expect(revalidatePath).toHaveBeenCalledTimes(6);
  expect(revalidatePath).toHaveBeenCalledWith("/tag/[slug]", "page");
  expect(revalidatePath).toHaveBeenCalledWith("/search");
  expect(revalidatePath).toHaveBeenCalledWith("/archive");
  expect(revalidateContent).not.toHaveBeenCalled();
});

it("logs initialization errors without undoing the committed write", async () => {
  getDb.mockRejectedValueOnce(new Error("Connection failed"));
  await expect(revalidatePosts("author-1")).resolves.toBeUndefined();
  expect(console.error).toHaveBeenCalledWith(
    "Post cache invalidation error:",
    expect.any(Error),
  );
});
