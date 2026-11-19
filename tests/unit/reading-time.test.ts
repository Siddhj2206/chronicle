import { describe, expect, it } from "vitest";

import { readingTimeMinutes } from "@/lib/reading-time";

describe("readingTimeMinutes", () => {
  it("returns at least one minute for empty or syntax-only markdown", () => {
    for (const content of ["", " \n\t", "# *** --- >"]) {
      expect(readingTimeMinutes(content)).toBe(1);
    }
  });

  it("uses 238 words per minute, rounding up", () => {
    expect(readingTimeMinutes("word ".repeat(238))).toBe(1);
    expect(readingTimeMinutes("word ".repeat(239))).toBe(2);
  });

  it("ignores fenced code, image alt text, link URLs and markup", () => {
    const prose = "# **word** ".repeat(238);
    expect(readingTimeMinutes(`${prose}\n\`\`\`ts\n${"code ".repeat(1000)}\n\`\`\`\n`)).toBe(1);
    expect(readingTimeMinutes(`${prose}\n~~~\n${"code ".repeat(1000)}\n~~~\n`)).toBe(1);
    expect(readingTimeMinutes(`[${"word ".repeat(238)}](https://example.test/long/path)`)).toBe(1);
    expect(readingTimeMinutes(`<p>${"word ".repeat(238)}</p>`)).toBe(1);
  });

  it("allows twelve seconds per image, excluding images in code blocks", () => {
    expect(readingTimeMinutes("![photo](image.png)\n".repeat(6))).toBe(2);
    expect(readingTimeMinutes('<img src="image.png">'.repeat(6))).toBe(2);
    expect(readingTimeMinutes("```md\n" + "![photo](image.png)\n".repeat(6) + "```\n")).toBe(1);
  });

  it("handles unicode prose and incomplete markdown without throwing", () => {
    expect(readingTimeMinutes("世界 ".repeat(239))).toBe(2);
    expect(readingTimeMinutes("![unfinished ** [link]( `code")).toBe(1);
  });
});
