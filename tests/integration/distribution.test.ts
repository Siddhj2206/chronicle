import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { GET as siteFeed } from "@/app/feed.xml/route";
import { GET as authorFeed } from "@/app/(main)/[username]/feed.xml/route";
import { GET as articleImage } from "@/app/(main)/[username]/[slug]/og/route";
import { generateMetadata as homeMetadata } from "@/app/(main)/page";
import { generateMetadata as profileMetadata } from "@/app/(main)/[username]/page";
import { generateMetadata as postMetadata } from "@/app/(main)/[username]/[slug]/page";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import * as database from "@/lib/db";
import { getFeedPosts, getPublicArticle } from "@/lib/distribution";
import { getSession } from "@/lib/session";
import { createPost, createUser, resetDatabase } from "@/tests/helpers/db";

beforeEach(async () => {
  await resetDatabase();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://distribution.example");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("published distribution", () => {
  it("limits feeds to the latest 20 published stories, with per-author isolation", async () => {
    const author = await createUser({ username: "writer" });
    const other = await createUser({ username: "another_writer" });
    for (let index = 0; index < 23; index++) {
      await createPost(author.id, {
        title: `Story ${index}`,
        publishedAt: new Date(Date.UTC(2025, 0, index + 1)),
      });
    }
    await createPost(author.id, {
      title: "Secret draft",
      published: false,
      publishedAt: new Date("2030-01-01"),
    });
    await createPost(other.id, {
      title: "Another author's latest",
      publishedAt: new Date("2026-01-01"),
    });
    const rows = await getFeedPosts();
    expect(rows).toHaveLength(20);
    expect(rows[0].post.title).toBe("Another author's latest");
    expect(rows[1].post.title).toBe("Story 22");
    expect(rows.at(-1)?.post.title).toBe("Story 4");
    const own = await getFeedPosts("writer");
    expect(own).toHaveLength(20);
    expect(own[0].post.title).toBe("Story 22");
    expect(own.at(-1)?.post.title).toBe("Story 3");
    const response = await siteFeed();
    expect(response.headers.get("content-type")).toBe(
      "application/rss+xml; charset=utf-8",
    );
    const xml = await response.text();
    expect(xml.match(/<item>/g)).toHaveLength(20);
    expect(xml).not.toContain("Secret draft");
    const scoped = await authorFeed(
      new Request("https://untrusted.example/@writer/feed.xml"),
      { params: Promise.resolve({ username: "%40writer" }) },
    );
    const scopedXml = await scoped.text();
    expect(scopedXml).not.toContain("Another author");
    expect(scopedXml).toContain("https://distribution.example/@writer/");
    expect(scopedXml).not.toContain("untrusted.example");
  });

  it("handles an empty feed, an empty public author and unknown authors", async () => {
    expect(await (await siteFeed()).text()).not.toContain("<item>");
    const author = await createUser({ username: "empty_writer" });
    await createPost(author.id, { title: "Never published", published: false });
    const response = await authorFeed(new Request("https://example.test"), {
      params: Promise.resolve({ username: "@empty_writer" }),
    });
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain("Never published");
    expect(
      (
        await authorFeed(new Request("https://example.test"), {
          params: Promise.resolve({ username: "missing" }),
        })
      ).status,
    ).toBe(404);
  });

  it("lists only published article URLs and named profiles in the sitemap", async () => {
    const author = await createUser({ username: "writer" });
    const noProfile = await createUser({ username: null });
    await createPost(author.id, { slug: "public-story" });
    await createPost(author.id, { slug: "private-story", published: false });
    await createPost(noProfile.id, { slug: "no-profile" });
    const entries = await sitemap();
    const urls = entries.map(({ url }) => url);
    expect(urls).toContain("https://distribution.example/");
    expect(urls).toContain("https://distribution.example/archive");
    expect(urls).toContain("https://distribution.example/@writer");
    expect(urls).toContain("https://distribution.example/@writer/public-story");
    expect(
      urls.some((url) =>
        /private-story|no-profile|manuscripts|sign-in/.test(url),
      ),
    ).toBe(false);
    expect(robots().sitemap).toBe("https://distribution.example/sitemap.xml");
  });

  it("excludes drafts from social image lookups even for their authenticated owner", async () => {
    const author = await createUser({ username: "writer" });
    const draft = await createPost(author.id, {
      published: false,
      slug: "private",
    });
    vi.mocked(getSession).mockResolvedValue({
      user: { id: author.id },
    } as Awaited<ReturnType<typeof getSession>>);
    expect(await getPublicArticle("writer", draft.slug)).toBeNull();
    expect(
      (
        await articleImage(new Request("https://example.test"), {
          params: Promise.resolve({ username: "@writer", slug: draft.slug }),
        })
      ).status,
    ).toBe(404);
    const metadata = await postMetadata({
      params: Promise.resolve({ username: "@writer", slug: draft.slug }),
    });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("exposes canonical metadata on actual home, profile and article pages", async () => {
    const author = await createUser({ username: "writer", name: "A Writer" });
    await createPost(author.id, { slug: "hello-world" });
    expect(homeMetadata().alternates?.canonical).toBe(
      "https://distribution.example/",
    );
    const profile = await profileMetadata({
      params: Promise.resolve({ username: "%40writer" }),
    });
    expect(profile.alternates?.canonical).toBe(
      "https://distribution.example/@writer",
    );
    const article = await postMetadata({
      params: Promise.resolve({ username: "@writer", slug: "hello-world" }),
    });
    expect(article.alternates?.canonical).toBe(
      "https://distribution.example/@writer/hello-world",
    );
    expect(article).toMatchObject({
      openGraph: {
        images: [
          { url: "https://distribution.example/@writer/hello-world/og" },
        ],
      },
    });
  });

  it("reports database outages as errors instead of successful empty feeds or sitemaps", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const db = vi.spyOn(database, "getDb");
    db.mockRejectedValueOnce(new Error("Database unavailable"));
    expect((await siteFeed()).status).toBe(503);
    db.mockRejectedValueOnce(new Error("Database unavailable"));
    expect(
      (
        await articleImage(new Request("https://example.test"), {
          params: Promise.resolve({ username: "writer", slug: "story" }),
        })
      ).status,
    ).toBe(503);
    db.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(sitemap()).rejects.toThrow("Database unavailable");
  });
});
