import { describe, expect, it } from "vitest";

import { profileStories, profileTab } from "@/lib/profile";

function story(
  id: string,
  viewCount = 0,
  publishedAt: Date | null = new Date("2025-01-01"),
  published = true,
) {
  return { post: { id, viewCount, publishedAt, published } };
}

describe("profile tabs", () => {
  it("recognizes Home and About", () => {
    expect(profileTab("home")).toBe("home");
    expect(profileTab("about")).toBe("about");
  });
  it.each([undefined, null, "lists", "", ["about"], {}, 12])(
    "falls back safely for %j",
    (value) => {
      expect(profileTab(value)).toBe("home");
    },
  );
});

describe("profile stories", () => {
  it("features the most-viewed published story, never a draft", () => {
    const featured = story("popular", 12);
    const newest = story("newest", 1, new Date("2025-02-01"));
    const older = story("older", 2);
    expect(
      profileStories([
        older,
        newest,
        featured,
        story("draft", 900, null, false),
      ]),
    ).toEqual({ featured, remaining: [newest, older], count: 3 });
  });
  it("uses newest when all views are zero or tied", () => {
    const newest = story("newest", 0, new Date("2025-02-01"));
    expect(profileStories([story("older"), newest]).featured).toBe(newest);
    expect(
      profileStories([story("a", 3), story("b", 3, new Date("2025-02-01"))])
        .featured?.post.id,
    ).toBe("b");
  });
  it("handles missing dates and breaks equal-date ties by id without mutating input", () => {
    const input = [story("z"), story("missing", 0, null), story("a")];
    const snapshot = [...input];
    expect(profileStories(input).remaining.map(({ post }) => post.id)).toEqual([
      "z",
      "missing",
    ]);
    expect(profileStories(input).featured?.post.id).toBe("a");
    expect(input).toEqual(snapshot);
  });
  it("handles a single story without repeating it", () => {
    const only = story("only");
    expect(profileStories([only])).toEqual({
      featured: only,
      remaining: [],
      count: 1,
    });
  });
  it("handles empty and draft-only profiles", () => {
    const empty = { featured: undefined, remaining: [], count: 0 };
    expect(profileStories([])).toEqual(empty);
    expect(profileStories([story("draft", 99, null, false)])).toEqual(empty);
  });
});
