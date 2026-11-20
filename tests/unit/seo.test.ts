import { afterEach, describe, expect, it, vi } from "vitest";

import { escapeXml, renderRss } from "@/lib/distribution";
import {
  articleJsonLd,
  articleMetadata,
  articlePath,
  authorPath,
  cleanUsername,
  feedAlternates,
  pageMetadata,
  serializeJsonLd,
  siteUrl,
} from "@/lib/seo";

import type { DistributionPost } from "@/lib/distribution";

const row: DistributionPost = {
  post: {
    id: "post",
    title: 'A <story> & "ideas"',
    slug: "café & notes",
    excerpt: "<p>Read & reflect</p>",
    publishedAt: new Date("2025-01-02"),
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-03"),
  },
  author: { name: "Alex & Mira's journal", username: "writer" },
};

afterEach(() => vi.unstubAllEnvs());

describe("distribution URLs and metadata", () => {
  it("uses the configured origin and encodes each route segment", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://stories.example:8443/");
    expect(siteUrl()).toBe("https://stories.example:8443/");
    expect(siteUrl(articlePath("a & b", "café/notes"))).toBe(
      "https://stories.example:8443/@a%20%26%20b/caf%C3%A9%2Fnotes",
    );
    expect(authorPath("東京")).toBe("/@%E6%9D%B1%E4%BA%AC");
    expect(cleanUsername("%40writer")).toBe("writer");
    expect(cleanUsername("@writer")).toBe("writer");
    expect(cleanUsername("%broken")).toBe("");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "ftp://example.test");
    expect(() => siteUrl()).toThrow("http(s)");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://user:password@example.test");
    expect(() => siteUrl()).toThrow("http(s)");
  });

  it("provides absolute canonical, OpenGraph, Twitter and feed URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://stories.example");
    const metadata = articleMetadata(
      { ...row.post, published: true },
      row.author,
    );
    const canonical = "https://stories.example/@writer/caf%C3%A9%20%26%20notes";
    expect(metadata).toMatchObject({
      alternates: { canonical },
      openGraph: {
        url: canonical,
        type: "article",
        images: [{ url: `${canonical}/og` }],
        publishedTime: "2025-01-02T00:00:00.000Z",
      },
      twitter: {
        card: "summary_large_image",
        images: [{ url: `${canonical}/og` }],
      },
    });
    expect(
      pageMetadata({ title: "Chronicle", description: "Stories", path: "/" }),
    ).toMatchObject({
      alternates: { canonical: "https://stories.example/" },
      openGraph: { type: "website" },
    });
    expect(
      pageMetadata({
        title: "Writer",
        description: "Stories",
        path: authorPath("writer"),
        username: "writer",
      }),
    ).toMatchObject({
      alternates: {
        canonical: "https://stories.example/@writer",
        types: feedAlternates("writer"),
      },
      openGraph: { type: "profile" },
    });
    expect(feedAlternates("writer")["application/rss+xml"]).toHaveLength(2);
  });

  it("does not distribute draft metadata or structured data", () => {
    const draft = { ...row.post, published: false };
    expect(articleMetadata(draft, row.author)).toMatchObject({
      robots: { index: false, follow: false },
      openGraph: null,
      twitter: null,
    });
    expect(articleJsonLd(draft, row.author)).toBeNull();
  });

  it("escapes script terminators in JSON-LD without altering article data", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://stories.example/");
    const article = {
      ...row.post,
      title: '</script><script>alert("x")</script>',
      published: true,
      publishedAt: null,
    };
    const data = articleJsonLd(article, row.author)!;
    expect(data).toMatchObject({
      "@type": "Article",
      headline: article.title,
      author: { name: row.author.name },
      datePublished: "2025-01-01T00:00:00.000Z",
      dateModified: "2025-01-03T00:00:00.000Z",
      image: `${siteUrl(articlePath("writer", article.slug))}/og`,
    });
    const serialized = serializeJsonLd(data);
    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c/script>");
    expect(JSON.parse(serialized)).toEqual(data);
  });
});

describe("RSS serialization", () => {
  it("keeps post GUIDs stable when the author username or article slug changes", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://stories.example");
    const original = renderRss([row]);
    const renamed = renderRss([
      {
        ...row,
        post: { ...row.post, slug: "renamed-story" },
        author: { ...row.author, username: "renamed_writer" },
      },
    ]);
    const guid = '<guid isPermaLink="false">chronicle:post:post</guid>';
    expect(original).toContain(guid);
    expect(renamed).toContain(guid);
    expect(original).toContain(
      "<link>https://stories.example/@writer/caf%C3%A9%20%26%20notes</link>",
    );
    expect(renamed).toContain(
      "<link>https://stories.example/@renamed_writer/renamed-story</link>",
    );
    expect(
      renderRss([{ ...row, post: { ...row.post, id: "post&other" } }]),
    ).toContain(
      '<guid isPermaLink="false">chronicle:post:post&amp;other</guid>',
    );
  });

  it("escapes XML text and attributes and preserves valid Unicode", () => {
    expect(escapeXml(`&<>"' 東京🙂`)).toBe("&amp;&lt;&gt;&quot;&apos; 東京🙂");
    expect(escapeXml("before\u0000after\u000b")).toBe("beforeafter");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://stories.example");
    const xml = renderRss([row], row.author);
    expect(xml).toContain('version="2.0"');
    expect(xml).toContain("A &lt;story&gt; &amp; &quot;ideas&quot;");
    expect(xml).toContain("&lt;p&gt;Read &amp; reflect&lt;/p&gt;");
    expect(xml).toContain("Alex &amp; Mira&apos;s journal");
    expect(xml).toContain(
      "https://stories.example/@writer/caf%C3%A9%20%26%20notes",
    );
    expect(xml).toContain('href="https://stories.example/@writer/feed.xml"');
    expect(xml).toContain("Thu, 02 Jan 2025 00:00:00 GMT");
    expect(xml).not.toContain("<story>");
  });

  it("returns a valid empty channel and falls back to creation dates", () => {
    expect(renderRss([])).toContain("<channel>");
    expect(renderRss([])).not.toContain("<item>");
    expect(
      renderRss([
        { ...row, post: { ...row.post, publishedAt: null, excerpt: null } },
      ]),
    ).toContain("Wed, 01 Jan 2025 00:00:00 GMT");
  });
});
