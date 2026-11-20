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
import { PostSummary } from "@/components/posts/post-summary";

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
  subtitle: null,
  readingTimeMinutes: null,
  author: { id: "author", name: "Alex Morgan", username: "alex", image: null },
};

describe("Museum monograph components", () => {
  it("keeps subtitle precedence and stored reading time in the new feed layout", () => {
    for (const subtitle of ["A subtitle", null]) {
      const html = renderToStaticMarkup(
        createElement(ListCard, {
          layout: "feed",
          post: { ...post, subtitle, readingTimeMinutes: 7 },
        }),
      );
      expect(html).toContain(subtitle || post.excerpt!);
      if (subtitle) expect(html).not.toContain(post.excerpt!);
      expect(html).toContain("7 min read");
    }
    const empty = renderToStaticMarkup(
      createElement(ListCard, {
        layout: "feed",
        post: {
          ...post,
          subtitle: null,
          excerpt: null,
          content: "",
          readingTimeMinutes: null,
        },
      }),
    );
    expect(empty).toContain("1 min read");
    expect(empty).not.toContain(post.excerpt!);
  });
  it("keeps the subtitle or excerpt above article reading time in the reader deck", () => {
    for (const subtitle of ["A subtitle", null]) {
      const html = renderToStaticMarkup(
        createElement(PostSummary, {
          post: { ...post, subtitle },
          variant: "article",
        }),
      );
      expect(html).toContain("reader-deck");
      expect(html).toContain(subtitle || post.excerpt!);
      if (subtitle) expect(html).not.toContain(post.excerpt!);
      expect(html.indexOf(subtitle || post.excerpt!)).toBeLessThan(
        html.indexOf("min read"),
      );
    }
  });

  it("keeps reading time when an article has no subtitle or excerpt", () => {
    const html = renderToStaticMarkup(
      createElement(PostSummary, {
        post: { ...post, subtitle: null, excerpt: null },
        variant: "article",
      }),
    );
    expect(html).toContain("min read");
    expect(html.match(/<p /g)).toHaveLength(1);
  });
  it("shows subtitles instead of excerpts with reading time on every card", () => {
    for (const Card of [HeroCard, GridCard, ListCard]) {
      const html = renderToStaticMarkup(
        createElement(Card, {
          post: { ...post, subtitle: "A subtitle", readingTimeMinutes: 3 },
        }),
      );
      expect(html).toContain("A subtitle");
      expect(html).not.toContain("A closer look.");
      expect(html).toContain("min read");
    }
  });

  it("preserves linked topics in the feed layout without inventing empty topics", () => {
    const render = (tags?: StoryCardProps["post"]["tags"]) =>
      renderToStaticMarkup(
        createElement(ListCard, { layout: "feed", post: { ...post, tags } }),
      );
    expect(render()).not.toContain('aria-label="Topics"');
    expect(render()).toContain('aria-label="Sign in to save story"');
    expect(render([])).not.toContain('aria-label="Topics"');
    const html = render([
      { id: "topic", name: "東京", slug: "東京", createdAt: post.createdAt },
    ]);
    expect(html).toContain('href="/tag/%E6%9D%B1%E4%BA%AC"');
    expect(html).toContain("東京");
  });
  it("bounds long topic labels and preserves their full accessible names", () => {
    const name = "W".repeat(50);
    for (const Card of [HeroCard, GridCard, ListCard]) {
      const html = renderToStaticMarkup(
        createElement(Card, {
          post: {
            ...post,
            tags: [
              {
                id: "long-topic",
                name,
                slug: "long-topic",
                createdAt: new Date("2026-11-19"),
              },
            ],
          },
        }),
      );
      expect(html).toContain(`title="${name}"`);
      expect(html).toContain("min-w-0 max-w-full");
      expect(html).toContain('class="truncate"');
    }
  });
  it("keeps linked Unicode topics on every redesigned card", () => {
    for (const Card of [HeroCard, GridCard, ListCard]) {
      const html = renderToStaticMarkup(
        createElement(Card, {
          post: {
            ...post,
            tags: [
              {
                id: "topic",
                name: "東京",
                slug: "東京",
                createdAt: new Date("2026-11-19"),
              },
            ],
          },
        }),
      );
      expect(html).toContain('href="/tag/%E6%9D%B1%E4%BA%AC"');
      expect(html).toContain("東京");
    }
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

  it("renders feed metadata and a right-hand cover while retaining story links", () => {
    const html = renderToStaticMarkup(
      createElement(ListCard, {
        post: {
          ...post,
          content: "word ".repeat(461),
          author: { ...post.author, image: "/author.jpg" },
        },
        layout: "feed",
      }),
    );
    expect(html).toContain("data-feed-story");
    expect(html).toContain('href="/@alex/morning"');
    expect(html).toContain('href="/@alex"');
    expect(html).toContain("url=%2Fcover.jpg");
    expect(html).toContain("url=%2Fauthor.jpg");
    expect(html).toContain("A closer look.");
    expect(html).toContain("2 min read");
    expect(html).toContain('dateTime="2026-11-19T12:00:00.000Z"');
  });

  it("renders feed fallbacks without images, dates or excerpts", () => {
    const html = renderToStaticMarkup(
      createElement(ListCard, {
        post: {
          ...post,
          title: "",
          content: "",
          coverImage: null,
          publishedAt: null,
          excerpt: null,
        },
        layout: "feed",
      }),
    );
    expect(html).toContain("Untitled story");
    expect(html).toContain("1 min read");
    expect(html).toMatch(/aria-hidden="true"[^>]*>C<\/span>/);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<time");
  });

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
    expect(html).toContain("Staff picks");
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

  it("renders the feed layout with author portrait, excerpt, date and computed reading time", () => {
    const html = renderToStaticMarkup(
      createElement(ListCard, {
        layout: "feed",
        post: {
          ...post,
          content: "word ".repeat(500),
          author: { ...post.author, image: "/avatar.jpg" },
        },
      }),
    );
    expect(html).toContain('href="/@alex/morning"');
    expect(html).toContain('href="/@alex"');
    expect(html).toContain("avatar.jpg");
    expect(html).toContain("cover.jpg");
    expect(html).toContain("A closer look.");
    expect(html).toContain("3 min read");
    expect(html).toContain('dateTime="2026-11-19T12:00:00.000Z"');
  });

  it("renders small title and author initials when feed images are absent", () => {
    const html = renderToStaticMarkup(
      createElement(ListCard, {
        layout: "feed",
        post: {
          ...post,
          coverImage: null,
          excerpt: null,
          publishedAt: null,
          content: "",
        },
      }),
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<time");
    expect(html).toContain(">A</span>");
    expect(html).toContain("1 min read");
  });

  it("keeps Latest selected and hides the feature and rail in an empty feed", async () => {
    const html = renderToStaticMarkup(
      await FeedPage({ searchParams: Promise.resolve({ tab: "following" }) }),
    );
    expect(html).toContain('role="tab" aria-selected="true"');
    expect(html).toContain('href="/?tab=latest"');
    expect(html).toContain("No stories yet.");
    expect(html).not.toContain('aria-label="Featured story"');
    expect(html).not.toContain('data-testid="home-rail"');
  });
});
