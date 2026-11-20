import Link from "next/link";
import { redirect } from "next/navigation";

import { getSavedPosts } from "@/actions/bookmarks";
import { StoryCard } from "@/components/magazine/story-card";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<React.JSX.Element> {
  const session = await getSession();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=%2Flibrary");
  const { page } = await searchParams;
  const result = await getSavedPosts(page ?? 1);
  return (
    <div className="catalogue">
      <header className="catalogue-intro">
        <h1>Your reading list</h1>
        <p>Stories you’ve saved for later.</p>
      </header>
      {"error" in result ? (
        <p role="alert" className="py-12 text-muted-foreground">
          {result.error}
        </p>
      ) : result.totalCount === 0 ? (
        <section className="catalogue-empty space-y-4">
          <h2 className="font-serif text-3xl">Your reading list is empty</h2>
          <p className="text-muted-foreground">
            Save a story to come back to it later.
          </p>
          <Button variant="outline" asChild>
            <Link href="/archive">Find stories</Link>
          </Button>
        </section>
      ) : (
        <section aria-label="Saved stories">
          <div className="catalogue-section">
            <h2>Saved stories</h2>
            <p>
              {result.totalCount} saved{" "}
              {result.totalCount === 1 ? "story" : "stories"}
            </p>
          </div>
          <div className="catalogue-entries">
            {result.posts.map((post) => (
              <StoryCard key={post.id} post={post} />
            ))}
          </div>
          {result.totalPages > 1 && (
            <nav
              aria-label="Reading list pagination"
              className="mt-12 flex flex-wrap items-center justify-center gap-4 border-t border-border pt-8"
            >
              {result.currentPage > 1 ? (
                <Button variant="outline" asChild>
                  <Link href={`/library?page=${result.currentPage - 1}`}>
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  Previous
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Page {result.currentPage} of {result.totalPages}
              </span>
              {result.currentPage < result.totalPages ? (
                <Button variant="outline" asChild>
                  <Link href={`/library?page=${result.currentPage + 1}`}>
                    Next
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  Next
                </Button>
              )}
            </nav>
          )}
        </section>
      )}
    </div>
  );
}
