import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { context, objects, bucket, updateTag, cache } = vi.hoisted(() => {
  const objects = new Map<string, string>();
  return {
    context: vi.fn(),
    objects,
    bucket: {
      put: vi.fn(async (key: string, value: string) => {
        objects.set(key, value);
      }),
      get: vi.fn(async (key: string) =>
        objects.has(key) ? { text: async () => objects.get(key)! } : null,
      ),
      delete: vi.fn(async (keys: string | string[]) => {
        for (const key of typeof keys === "string" ? [keys] : keys)
          objects.delete(key);
      }),
      list: vi.fn(
        async (_options: {
          prefix: string;
          cursor?: string;
        }): Promise<{
          objects: { key: string }[];
          truncated: boolean;
          cursor?: string;
        }> => ({ objects: [], truncated: false }),
      ),
    },
    updateTag: vi.fn(),
    cache: vi.fn(
      (fn: () => Promise<string | null>, _key: string[], _options: unknown) =>
        fn,
    ),
  };
});

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: context }));
vi.mock("next/cache", () => ({ unstable_cache: cache, updateTag }));
vi.unmock("@/lib/r2-content");

import { deleteUserObjects, getR2, getR2PublicUrl } from "@/lib/r2";
import {
  deleteContent,
  getContent,
  revalidateContent,
  uploadContent,
} from "@/lib/r2-content";

beforeEach(() => {
  objects.clear();
  context.mockReset().mockResolvedValue({ env: { R2: bucket } });
  bucket.put.mockClear();
  bucket.get.mockClear();
  bucket.delete.mockClear();
  bucket.list.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("native R2 storage", () => {
  it("gets the current binding on every call", async () => {
    expect(await getR2()).toBe(bucket);
    const other = {};
    context.mockResolvedValueOnce({ env: { R2: other } });
    expect(await getR2()).toBe(other);
    expect(context).toHaveBeenCalledWith({ async: true });
  });

  it("reports a missing binding", async () => {
    context.mockResolvedValueOnce({ env: {} });
    await expect(getR2()).rejects.toThrow("Missing R2 binding");
  });

  it.each(["# Native bucket\nStored markdown.", ""])(
    "round-trips content %j",
    async (markdown) => {
      const key = await uploadContent("post-1", markdown);
      expect(key).toMatch(/^content\/post-1\/.+\.md$/);
      expect(bucket.put).toHaveBeenCalledWith(key, markdown, {
        httpMetadata: { contentType: "text/markdown; charset=utf-8" },
      });
      expect(await getContent("post-1", key)).toBe(markdown);
      expect(cache).toHaveBeenCalledWith(
        expect.any(Function),
        ["post-content-post-1", key],
        {
          tags: ["post-content-post-1"],
          revalidate: false,
        },
      );
      await deleteContent(key);
      expect(await getContent("post-1", key)).toBeNull();
    },
  );

  it("returns null for missing content", async () => {
    expect(await getContent("missing", "content/missing.md")).toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("propagates write failures", async () => {
    bucket.put.mockRejectedValueOnce(new Error("Storage unavailable"));
    await expect(uploadContent("post-1", "markdown")).rejects.toThrow(
      "Storage unavailable",
    );
  });

  it("logs read failures and returns null for DB fallback", async () => {
    bucket.get.mockRejectedValueOnce(new Error("Storage unavailable"));
    expect(await getContent("post-1", "content/post-1.md")).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch content content/post-1.md:",
      expect.any(Error),
    );
  });

  it("keeps deletion failures best-effort", async () => {
    bucket.delete.mockRejectedValueOnce(new Error("Storage unavailable"));
    await expect(deleteContent("old")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it("revalidates the existing cache tag", async () => {
    await revalidateContent("post-1");
    expect(updateTag).toHaveBeenCalledWith("post-content-post-1");
  });
});

describe("account cleanup", () => {
  it("deduplicates and batches content keys and paginates only the user's images", async () => {
    const keys = Array.from({ length: 1001 }, (_, i) => `content/${i}.md`);
    bucket.list
      .mockResolvedValueOnce({
        objects: [{ key: "uploads/owner/a" }],
        truncated: true,
        cursor: "next",
      })
      .mockResolvedValueOnce({
        objects: [{ key: "uploads/owner/b" }],
        truncated: false,
      });
    await deleteUserObjects("owner", [...keys, keys[0]]);
    expect(bucket.delete.mock.calls[0][0]).toHaveLength(1000);
    expect(bucket.delete.mock.calls[1][0]).toEqual([keys[1000]]);
    expect(bucket.delete).toHaveBeenCalledWith(["uploads/owner/a"]);
    expect(bucket.delete).toHaveBeenCalledWith(["uploads/owner/b"]);
    expect(bucket.list).toHaveBeenNthCalledWith(2, {
      prefix: "uploads/owner/",
      cursor: "next",
    });
  });

  it("handles an empty account without empty deletes", async () => {
    await deleteUserObjects("owner", []);
    expect(bucket.delete).not.toHaveBeenCalled();
  });

  it("continues cleanup after a batch fails", async () => {
    bucket.delete.mockRejectedValueOnce(new Error("Storage unavailable"));
    bucket.list.mockResolvedValueOnce({
      objects: [{ key: "uploads/owner/a" }],
      truncated: false,
    });
    await expect(deleteUserObjects("owner", ["old"])).resolves.toBeUndefined();
    expect(bucket.delete).toHaveBeenCalledWith(["uploads/owner/a"]);
    expect(console.error).toHaveBeenCalled();
  });

  it("logs binding failures without failing account deletion", async () => {
    context.mockRejectedValueOnce(new Error("No context"));
    await expect(deleteUserObjects("owner", [])).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

it("builds public media URLs and requires the public domain", () => {
  vi.stubEnv("NEXT_PUBLIC_R2_DOMAIN", "https://media.example.com/");
  expect(getR2PublicUrl("uploads/a.png")).toBe(
    "https://media.example.com/uploads/a.png",
  );
  vi.stubEnv("NEXT_PUBLIC_R2_DOMAIN", "");
  expect(() => getR2PublicUrl("a")).toThrow("Missing NEXT_PUBLIC_R2_DOMAIN");
});
