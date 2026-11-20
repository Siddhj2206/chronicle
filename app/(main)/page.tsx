import Link from "next/link";

import { getNewestPosts, getTrendingPosts } from "@/actions/posts";
import { HeroCard } from "@/components/magazine/hero-card";
import { ListCard } from "@/components/magazine/list-card";
import { SidebarList } from "@/components/magazine/sidebar-list";
import { FeedTabs } from "@/components/magazine/feed-tabs";
import { FeedWriters } from "@/components/magazine/feed-writers";
import { homeTab, homeWriters } from "@/lib/home-feed";

export const revalidate = 60;

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string | string[] }>;
} = {}): Promise<React.JSX.Element> {
  const activeTab = homeTab((await searchParams)?.tab);
  const [rawPosts, rawTrendingPosts] = await Promise.all([
    getNewestPosts(20),
    getTrendingPosts(5),
  ]);
  const posts = rawPosts.map(({ post, author }) => ({ ...post, author }));
  const trendingPosts = rawTrendingPosts.map(({ post, author }) => ({
    ...post,
    author,
  }));
  const writers = homeWriters(
    [...posts, ...trendingPosts].map((post) => post.author),
  );

  return (
    <div className="catalogue">
      <header className="flex flex-wrap items-end justify-between gap-5 pt-4 pb-10 md:pt-8 md:pb-12">
        <div>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-6xl">
            The journal
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Perspectives on the world around us.
          </p>
        </div>
        <Link
          href="/archive"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          View the archive ↗
        </Link>
      </header>
      {posts[0] && (
        <section aria-label="Featured story" className="mb-12 md:mb-16">
          <p className="mb-5 text-xs text-muted-foreground">Featured</p>
          <HeroCard post={posts[0]} className="!border-t-0 !pt-0" />
        </section>
      )}
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-16">
        <div className="min-w-0">
          <FeedTabs activeTab={activeTab} />
          <section
            id={`home-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`home-tab-${activeTab}`}
            tabIndex={0}
            className="focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {posts.length === 0 ? (
              <div className="catalogue-empty">
                <h2>No stories yet.</h2>
                <p>There’s room for your perspective. Be the first to write.</p>
                <Link
                  href="/new"
                  className="mt-5 inline-block text-sm underline underline-offset-4"
                >
                  Write a story
                </Link>
              </div>
            ) : (
              <>
                {posts.slice(1).map((post) => (
                  <ListCard key={post.id} post={post} layout="feed" />
                ))}
                {posts.length === 1 && (
                  <p className="py-8 text-sm text-muted-foreground">
                    You’re all caught up. More perspectives are on their way.
                  </p>
                )}
                <Link
                  href="/archive"
                  className="mt-8 inline-block text-sm underline underline-offset-4"
                >
                  Explore all stories ↗
                </Link>
              </>
            )}
          </section>
        </div>
        {posts.length > 0 && (
          <div
            data-testid="home-rail"
            className="hidden border-l border-border pl-8 lg:block"
          >
            {trendingPosts.length > 0 && (
              <SidebarList
                title="Staff picks"
                posts={trendingPosts}
                layout="rail"
              />
            )}
            <FeedWriters writers={writers} />
          </div>
        )}
      </div>
    </div>
  );
}
