import { describe, expect, it } from "vitest";

import { draftFormData, draftsMatch, editorUrl } from "@/lib/draft";

const draft = {
  title: "A story",
  excerpt: "A subtitle",
  content: "## Heading\n\n**Words**",
  coverImage: "",
};

describe("draft helpers", () => {
  it("tracks topic-only edits and clearing as repeated draft fields", () => {
    const fields = { ...draft, tags: ["Gardens", "東京"] };
    expect(draftsMatch(fields, { ...fields, tags: [...fields.tags] })).toBe(
      true,
    );
    expect(draftsMatch(fields, { ...fields, tags: [] })).toBe(false);
    expect(draftFormData(fields).getAll("tags")).toEqual(fields.tags);
    expect(draftFormData({ ...fields, tags: [] }).getAll("tags")).toEqual([]);
  });
  it("compares every persisted field without normalizing Markdown", () => {
    expect(draftsMatch(draft, { ...draft })).toBe(true);
    for (const key of Object.keys(draft)) {
      expect(
        draftsMatch(draft, {
          ...draft,
          [key]: `${draft[key as keyof typeof draft]} changed`,
        }),
      ).toBe(false);
    }
    expect(
      draftsMatch(
        { title: "", excerpt: "", content: "", coverImage: "" },
        { title: "", excerpt: "", content: "", coverImage: "" },
      ),
    ).toBe(true);
  });
  it("passes empty optional fields and unchanged Markdown to the existing actions", () => {
    const data = draftFormData(draft);
    expect(Object.fromEntries(data)).toEqual(draft);
  });
  it("accepts only complete web URLs for links and placeholder embeds", () => {
    expect(editorUrl(" https://example.com/story ")).toBe(
      "https://example.com/story",
    );
    expect(editorUrl("http://example.com")).toBe("http://example.com/");
    for (const value of [
      "",
      "example.com",
      "javascript:alert(1)",
      "data:text/html,test",
      "not a url",
    ])
      expect(editorUrl(value)).toBeNull();
  });
});
