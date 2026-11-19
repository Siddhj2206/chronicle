import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FeedPage from "@/app/(main)/page";
import { getNewestPosts, getTrendingPosts } from "@/actions/posts";
import { HeroCard } from "@/components/magazine/hero-card";
import { GridCard } from "@/components/magazine/grid-card";
import { ListCard } from "@/components/magazine/list-card";
import { SidebarList } from "@/components/magazine/sidebar-list";
import { PostContent } from "@/components/posts/post-content";

import type { StoryCardProps } from "@/components/magazine/story-card";

vi.mock("@/actions/posts", () => ({
  getNewestPosts: vi.fn(),
  getTrendingPosts: vi.fn(),
}));

const post: StoryCardProps["post"] = {
  id: "story",
  authorId: "author",
  title: "An ordinary morning",
  slug: "morning",
  content: "A story.",
  contentPath: null,
  excerpt: "A closer look.",
  coverImage: "/cover.jpg",
  viewCount: 0,
  published: true,
  publishedAt: new Date("2026-11-19T12:00:00Z"),
  createdAt: new Date("2026-11-19T12:00:00Z"),
  updatedAt: new Date("2026-11-19T12:00:00Z"),
  searchVector: null,
  author: { id: "author", name: "Alex Morgan", username: "alex", image: null },
};

describe("Museum monograph components", () => {
  it("links real response counts, pluralizes zero and one, and omits unavailable counts", () => {
    for (const responseCount of [0, 1, 3]) {
      const html = renderToStaticMarkup(
        createElement(ListCard, { post: { ...post, responseCount } }),
      );
      expect(html).toContain('href="/@alex/morning#responses"');
      expect(html).toContain(
        `${responseCount} ${responseCount === 1 ? "response" : "responses"}`,
      );
    }
    expect(
      renderToStaticMarkup(createElement(ListCard, { post })),
    ).not.toContain("#responses");
  });
  beforeEach(() => {
    vi.mocked(getNewestPosts).mockResolvedValue([]);
    vi.mocked(getTrendingPosts).mockResolvedValue([]);
  });

  it.each([HeroCard, GridCard, ListCard])(
    "preserves story and author links and accessible cover names",
    (Card) => {
      const html = renderToStaticMarkup(createElement(Card, { post }));
      expect(html).toContain('href="/@alex/morning"');
      expect(html).toContain('href="/@alex"');
      expect(html).toContain('aria-label="An ordinary morning"');
      expect(html).toContain("url=%2Fcover.jpg");
      expect(html).toContain("A closer look.");
      expect(html).toContain('dateTime="2026-11-19T12:00:00.000Z"');
    },
  );

  it("renders a decorative title initial and omits absent dates and excerpts", () => {
    const html = renderToStaticMarkup(
      createElement(HeroCard, {
        post: { ...post, coverImage: null, publishedAt: null, excerpt: null },
      }),
    );
    expect(html).toContain('class="title-initial" aria-hidden="true">A</span>');
    expect(html).not.toContain("<time");
    expect(html).not.toContain("story-excerpt");
    expect(html).not.toContain("<img");
  });

  it("escapes untrusted titles and tolerates an empty title", () => {
    const html = renderToStaticMarkup(
      createElement(ListCard, {
        post: {
          ...post,
          title: '<script>alert("x")</script>',
          coverImage: null,
        },
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(
      renderToStaticMarkup(
        createElement(ListCard, {
          post: { ...post, title: "", coverImage: null },
        }),
      ),
    ).toContain('aria-label="Read story"');
    expect(
      renderToStaticMarkup(
        createElement(ListCard, {
          post: { ...post, title: "", coverImage: null },
        }),
      ),
    ).toContain('aria-hidden="true">C</span>');
  });

  it("renders empty home and reading-list states without fabricated stories", async () => {
    expect(renderToStaticMarkup(await FeedPage())).toContain("No stories yet.");
    const html = renderToStaticMarkup(
      createElement(SidebarList, { title: "Worth a read", posts: [] }),
    );
    expect(html).toContain("Worth a read");
    expect(html).not.toContain("<h3");
    expect(getNewestPosts).toHaveBeenCalledWith(20);
    expect(getTrendingPosts).toHaveBeenCalledWith(5);
  });

  it("keeps newest and trending entries and archive links without fixed mock counts", async () => {
    const row = {
      post,
      author: {
        ...post.author,
        email: "alex@example.com",
        emailVerified: false,
        bio: null,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    };
    vi.mocked(getNewestPosts).mockResolvedValue([row]);
    vi.mocked(getTrendingPosts).mockResolvedValue([row]);
    const html = renderToStaticMarkup(await FeedPage());
    expect(html).toContain('href="/archive"');
    expect(html).toContain("Worth a read");
    expect(html.match(/An ordinary morning/g)?.length).toBeGreaterThan(1);
    expect(html).not.toContain("02—07");
  });

  it("renders empty and untrusted Markdown safely while preserving links and highlighted code", () => {
    expect(
      renderToStaticMarkup(createElement(PostContent, { content: "" })),
    ).toMatch(/^<div class="post-content[^"]*"><\/div>$/);
    const html = renderToStaticMarkup(
      createElement(PostContent, {
        content:
          '<script>alert("x")</script>\n\n[Archive](/archive)\n\n```js\nconst answer = 42;\n```',
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain('href="/archive"');
    expect(html).toContain("--shiki-light:");
    expect(html).toContain("--shiki-dark:");
  });
});
