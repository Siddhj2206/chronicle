import { describe, expect, it } from "vitest";

import { normalizeTag, tagsSchema } from "@/lib/tags";

describe("topic slugs", () => {
  it.each([
    ["C", "c"],
    ["C++", "c-plus-plus"],
    ["C#", "c-sharp"],
    ["Ｃ＋＋", "c-plus-plus"],
    ["  Café Life  ", "cafe-life"],
    ["東京", "東京"],
    ["東京 2026", "東京-2026"],
    ["中文话题", "中文话题"],
    ["कला", "कला"],
    ["किला", "किला"],
  ])("normalizes %s to %s", (name, slug) => {
    expect(normalizeTag(name)).toBe(slug);
  });

  it("deduplicates equivalent names without merging distinct languages or topics", () => {
    expect(tagsSchema.parse(["C", "C++", "C#", "Ｃ＋＋", "東京"])).toEqual([
      { name: "C", slug: "c" },
      { name: "Ｃ＋＋", slug: "c-plus-plus" },
      { name: "C#", slug: "c-sharp" },
      { name: "東京", slug: "東京" },
    ]);
  });

  it("keeps vowel marks distinct and canonically normalizes combining marks", () => {
    expect(tagsSchema.parse(["कला", "किला"])).toEqual([
      { name: "कला", slug: "कला" },
      { name: "किला", slug: "किला" },
    ]);
    expect(normalizeTag("\u0958")).toBe(normalizeTag("\u0915\u093c"));
    expect(normalizeTag("\u0958")).toBe(
      normalizeTag("\u0958").normalize("NFC"),
    );
  });

  it("accepts no tags and rejects empty or punctuation-only names", () => {
    expect(tagsSchema.parse([])).toEqual([]);
    for (const name of ["", "  ", "!!!", "😀"]) {
      expect(normalizeTag(name)).toBe("");
      expect(tagsSchema.safeParse([name]).success).toBe(false);
    }
  });
});
