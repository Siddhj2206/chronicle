import { afterEach, describe, expect, it, vi } from "vitest";

import { shareArticle } from "@/lib/share-article";

afterEach(() => vi.unstubAllGlobals());

describe("article sharing", () => {
  it("uses native sharing when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });
    await expect(
      shareArticle("A story", "https://example.test/story"),
    ).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({
      title: "A story",
      url: "https://example.test/story",
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it.each([undefined, vi.fn().mockRejectedValue(new Error("Unavailable"))])(
    "copies the URL when native sharing is unavailable or fails",
    async (share) => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { share, clipboard: { writeText } });
      await expect(
        shareArticle("", "https://example.test/story"),
      ).resolves.toBe("copied");
      expect(writeText).toHaveBeenCalledWith("https://example.test/story");
    },
  );

  it("does not copy or report failure when native sharing is cancelled", async () => {
    const writeText = vi.fn();
    vi.stubGlobal("navigator", {
      share: vi
        .fn()
        .mockRejectedValue(new DOMException("Cancelled", "AbortError")),
      clipboard: { writeText },
    });
    await expect(
      shareArticle("Story", "https://example.test/story"),
    ).resolves.toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("propagates clipboard errors so the UI can offer a manual link", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
    });
    await expect(
      shareArticle("Story", "https://example.test/story"),
    ).rejects.toThrow("Permission denied");
  });
});
