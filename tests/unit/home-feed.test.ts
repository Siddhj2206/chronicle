import { describe, expect, it } from "vitest";

import { HOME_TABS, homeTab, homeWriters } from "@/lib/home-feed";

describe("home feed tabs", () => {
  it("offers only features available on main", () => {
    expect(HOME_TABS).toEqual([{ id: "latest", label: "Latest" }]);
    expect(homeTab("latest")).toBe("latest");
  });

  it.each([undefined, null, "", "following", "for-you", ["latest"], 3])(
    "falls back to Latest for unsupported or malformed tab values: %s",
    (value) => {
      expect(homeTab(value)).toBe("latest");
    },
  );
});

describe("home writers", () => {
  const authors = Array.from({ length: 6 }, (_, index) => ({
    id: String(index),
    name: `Writer ${index}`,
    username: `writer_${index}`,
    image: null,
  }));

  it("keeps at most four distinct writers in feed order", () => {
    expect(homeWriters([authors[0], authors[0], ...authors.slice(1)])).toEqual(
      authors.slice(0, 4),
    );
  });

  it("omits writers without a public profile", () => {
    expect(
      homeWriters([{ ...authors[0], username: null }, authors[1]]),
    ).toEqual([authors[1]]);
  });

  it("does not fabricate writers for an empty feed", () => {
    expect(homeWriters([])).toEqual([]);
  });
});
