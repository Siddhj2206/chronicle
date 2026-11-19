import Link from "next/link";

import { getNewestPosts, getTrendingPosts } from "@/actions/posts";
import { HeroCard } from "@/components/magazine/hero-card";
import { ListCard } from "@/components/magazine/list-card";
import { SidebarList } from "@/components/magazine/sidebar-list";
import { Masthead } from "@/components/magazine/masthead";
import { pageMetadata, SITE_DESCRIPTION } from "@/lib/seo";

import type { Metadata } from "next";

export const revalidate = 60;

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Chronicle",
    description: SITE_DESCRIPTION,
    path: "/",
  });
}

export default async function FeedPage(): Promise<React.JSX.Element> {
  const [rawPosts, rawTrendingPosts] = await Promise.all([
    getNewestPosts(20),
    getTrendingPosts(5),
  ]);
  const posts = rawPosts.map(({ post, author }) => ({ ...post, author }));
  const trendingPosts = rawTrendingPosts.map(({ post, author }) => ({
    ...post,
    author,
  }));

  return (
    <div className="catalogue">
      <Masthead />
      {posts.length === 0 ? (
        <div className="catalogue-empty">
          <h2>No stories yet.</h2>
          <p>There’s room for your perspective. Be the first to write.</p>
        </div>
      ) : (
        <>
          <HeroCard post={posts[0]} />
          <div className="catalogue-section">
            <h2>Selected works</h2>
            <Link href="/archive">View the archive ↗</Link>
          </div>
          <div className="catalogue-entries">
            {posts.slice(1).map((post) => (
              <ListCard key={post.id} post={post} />
            ))}
          </div>
          <SidebarList title="Worth a read" posts={trendingPosts} />
        </>
      )}
    </div>
  );
}
