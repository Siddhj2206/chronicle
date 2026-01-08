import { getNewestPosts } from "@/actions/posts";
import { HeroCard } from "@/components/magazine/hero-card";
import { GridCard } from "@/components/magazine/grid-card";
import { ListCard } from "@/components/magazine/list-card";
import { SidebarList } from "@/components/magazine/sidebar-list";
import { Masthead } from "@/components/magazine/masthead";

export const revalidate = 60;

export default async function FeedPage() {
  const rawPosts = await getNewestPosts(20);
  
  // Transform data to match component expectations (Post & { author: User })
  const posts = rawPosts.map(({ post, author }) => ({
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
            The printing presses are silent. Be the first to write.
          </p>
        </div>
      </>
    );
  }

  // Slice content for layout
  const heroPost = posts[0];
  const gridPosts = posts.slice(1, 4);
  const mainListPosts = posts.slice(4);
  const trendingPosts = posts.slice(0, 5); // Simulate trending with top posts

  return (
    <>
      <Masthead />
      <div className="flex flex-col gap-12 pb-20">
        {/* Hero Section */}
        <section>
          <HeroCard post={heroPost} />
        </section>

        {/* Grid Section (The Fold) */}
        {gridPosts.length > 0 && (
          <section className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-x-8 md:gap-y-12 md:divide-x md:divide-neutral-200 dark:md:divide-neutral-800">
            {gridPosts.map((post) => (
              <GridCard key={post.id} post={post} />
            ))}
          </section>
        )}

        {/* Archive & Sidebar Section */}
        <section className="grid grid-cols-1 gap-12 border-t border-black pt-12 dark:border-white md:grid-cols-12">
          {/* Main Feed (Left) */}
          <div className="md:col-span-8 md:border-r md:border-neutral-200 md:pr-12 dark:md:border-neutral-800">
            <div className="mb-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-black dark:bg-white" />
              <span className="font-sans text-xs font-black uppercase tracking-widest text-muted-foreground">
                Latest Stories
              </span>
              <div className="h-px flex-1 bg-black dark:bg-white" />
            </div>
            
            <div className="flex flex-col gap-8 divide-y divide-neutral-200 dark:divide-neutral-800">
              {mainListPosts.map((post) => (
                <ListCard key={post.id} post={post} className="pt-8 first:pt-0" />
              ))}
              {mainListPosts.length === 0 && (
                <p className="py-8 text-center font-serif text-muted-foreground italic">
                  No more stories to load.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar (Right) */}
          <div className="md:col-span-4">
            <div className="sticky top-24">
              <SidebarList title="Trending Now" posts={trendingPosts} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
