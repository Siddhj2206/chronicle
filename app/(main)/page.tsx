import Link from "next/link";

import { getNewestPosts, getTrendingPosts } from "@/actions/posts";
import { HeroCard } from "@/components/magazine/hero-card";
import { GridCard } from "@/components/magazine/grid-card";
import { ListCard } from "@/components/magazine/list-card";
import { SidebarList } from "@/components/magazine/sidebar-list";
import { Masthead } from "@/components/magazine/masthead";

export const revalidate = 60;

export default async function FeedPage() {
  // Fetch both data sources in parallel to eliminate waterfall
  const [rawPosts, rawTrendingPosts] = await Promise.all([
    getNewestPosts(20),
    getTrendingPosts(5),
  ]);

  // Transform data to match component expectations (Post & { author: User })
  const posts = rawPosts.map(({ post, author }) => ({
    ...post,
    author,
  }));

  const trendingPosts = rawTrendingPosts.map(({ post, author }) => ({
    ...post,
    author,
  }));

  if (posts.length === 0) {
    return (
      <>
        <Masthead />
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <h2 className="font-serif text-3xl font-bold text-muted-foreground">
            No stories yet.
          </h2>
          <p className="mt-2 text-muted-foreground">
            There’s room for your perspective. Be the first to write.
          </p>
        </div>
      </>
    );
  }

  // Slice content for layout
  const heroPost = posts[0];
  const gridPosts = posts.slice(1, 4);
  const mainListPosts = posts.slice(4);

  return (
    <>
      <Masthead />
      <div className="flex flex-col gap-12 pb-16 md:gap-20">
        {/* Hero Section */}
        <section>
          <HeroCard post={heroPost} />
        </section>

        {/* Grid Section (The Fold) */}
        {gridPosts.length > 0 && (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {gridPosts.map((post) => (
              <GridCard key={post.id} post={post} />
            ))}
          </section>
        )}

        {/* Archive & Sidebar Section */}
        <section className="grid grid-cols-1 gap-12 md:grid-cols-12">
          {/* Main Feed (Left) */}
          <div className="md:col-span-8 md:pr-8">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-serif text-3xl font-normal">
                Latest stories
              </h2>
              <Link
                href="/archive"
                className="font-sans text-sm text-muted-foreground hover:text-primary"
              >
                View archive →
              </Link>
            </div>

            <div className="flex flex-col gap-12">
              {mainListPosts.map((post) => (
                <ListCard key={post.id} post={post} />
              ))}
              {mainListPosts.length === 0 && (
                <p className="py-8 font-serif text-muted-foreground">
                  You’re all caught up.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar (Right) */}
          <div className="md:col-span-4">
            <div className="sticky top-24">
              <SidebarList title="Worth a read" posts={trendingPosts} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
