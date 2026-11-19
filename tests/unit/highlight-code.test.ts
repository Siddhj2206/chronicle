import { describe, expect, it } from "vitest";

import { highlightCode } from "@/lib/highlight-code";

describe("highlightCode", () => {
  it("highlights a known language with light and dark theme variables", () => {
    const html = highlightCode("const answer = 42;", "typescript");
    expect(html).toContain("--shiki-light:");
    expect(html).toContain("--shiki-dark:");
    expect(html).toContain("answer");
    expect(html).toMatch(/<span style=/);
  });

  it("renders unknown languages as escaped plain text", () => {
    expect(highlightCode('<script>alert("x")</script>', "not-a-language"))
      .toBe(highlightCode('<script>alert("x")</script>', "text"));
    expect(highlightCode("<script>", "not-a-language")).toContain("&#x3C;script>");
  });

  it("renders code without a language as plain text", () => {
    expect(highlightCode("hello")).toBe(highlightCode("hello", "text"));
  });

  it("handles empty code", () => {
    expect(highlightCode("", "js")).toContain("<code>");
  });
});
