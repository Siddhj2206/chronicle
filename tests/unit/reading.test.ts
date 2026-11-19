import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { ArticleContents } from "@/components/posts/article-contents";
import { PostContent } from "@/components/posts/post-content";
import { analyzeReading } from "@/lib/reading";

describe("article reading metadata", () => {
  it("reserves the article navbar theme toggle id", () => {
    const content = "## Theme toggle\n\n## Theme toggle\n\n## Theme toggle-1";
    const { headings } = analyzeReading(content);
    expect(headings.map(({ id }) => id)).toEqual([
      "theme-toggle-1",
      "theme-toggle-2",
      "theme-toggle-1-1",
    ]);
    const html = renderToStaticMarkup(createElement(PostContent, { content }));
    for (const { id } of headings) expect(html).toContain(`id="${id}"`);
    expect(html).not.toContain('id="theme-toggle"');
  });

  it("estimates at 230 words per minute, rounding up", () => {
    expect(analyzeReading("word ".repeat(230)).minutes).toBe(1);
    expect(analyzeReading("word ".repeat(231)).minutes).toBe(2);
    expect(analyzeReading("word ".repeat(460)).minutes).toBe(2);
  });

  it("handles empty and malformed markdown without losing readable text", () => {
    expect(analyzeReading("")).toEqual({ minutes: 1, headings: [] });
    expect(analyzeReading("[unclosed **markdown")).toEqual({
      minutes: 1,
      headings: [],
    });
    expect(
      analyzeReading(`[A note](https://example.com/${"path/".repeat(300)})`)
        .minutes,
    ).toBe(1);
    expect(analyzeReading(`<!-- ${"hidden ".repeat(300)} -->`).minutes).toBe(1);
  });

  it("collects real headings, supports inline formatting and setext, and deduplicates slugs", () => {
    const content =
      "# Intro\n\n## A *quiet* day\n\n### A quiet day\n\n## A quiet day-1\n\nSecond chapter\n---\n\n```md\n## Not a heading\n```\n\n## !!!\n\n## Café 中文";
    const { headings } = analyzeReading(content);
    expect(headings).toEqual([
      { id: "a-quiet-day", text: "A quiet day", level: 2 },
      { id: "a-quiet-day-1", text: "A quiet day", level: 3 },
      { id: "a-quiet-day-1-1", text: "A quiet day-1", level: 2 },
      { id: "second-chapter", text: "Second chapter", level: 2 },
      { id: "section", text: "!!!", level: 2 },
      { id: "café-中文", text: "Café 中文", level: 2 },
    ]);
    const html = renderToStaticMarkup(createElement(PostContent, { content }));
    for (const { id } of headings) expect(html).toContain(`id="${id}"`);
    expect(html).not.toContain('id="not-a-heading"');
    expect(analyzeReading(content).headings).toEqual(headings);
  });
});

describe("reading components", () => {
  it.each([
    "![A mountain](/mountain.jpg)",
    "[![A mountain](/mountain.jpg)](https://example.com)",
    "*![A mountain](/mountain.jpg)*",
    "**[![A mountain](/mountain.jpg)](https://example.com)**",
  ])("unwraps paragraphs containing images at any depth: %s", (content) => {
    const html = renderToStaticMarkup(createElement(PostContent, { content }));
    expect(html).toContain('<div class="my-10">');
    expect(html).toContain("<figure");
    expect(html).not.toContain("<p>");
  });

  it("only offers contents for at least three headings", () => {
    const headings = analyzeReading(
      "## First\n\n## Second\n\n### Third",
    ).headings;
    expect(
      renderToStaticMarkup(createElement(ArticleContents, { headings: [] })),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        createElement(ArticleContents, { headings: headings.slice(0, 2) }),
      ),
    ).toBe("");
    const html = renderToStaticMarkup(
      createElement(ArticleContents, { headings }),
    );
    expect(html).toContain("<details");
    expect(html).toContain('href="#third"');
    expect(html).toContain('aria-current="location"');
  });

  it("renders figures with title/alt captions, safe code and scrollable tables", () => {
    const html = renderToStaticMarkup(
      createElement(PostContent, {
        content:
          '![Mountain](/mountain.jpg "At dawn")\n\n![City](/city.jpg)\n\n> A thought\n\n| One | Two |\n| --- | --- |\n| A | B |\n\n```unknown\n<script>unsafe()</script>\n```',
      }),
    );
    expect(html).toContain("<figure");
    expect(html).toContain("At dawn</figcaption>");
    expect(html).toContain("City</figcaption>");
    expect(html).not.toMatch(/<p[^>]*><figure/);
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("<table");
    expect(html).toContain("<blockquote");
    expect(html).not.toContain("<script>");
  });
});
