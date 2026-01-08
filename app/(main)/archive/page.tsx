import Link from "next/link";

import { getAllPosts } from "@/actions/posts";
import { ListCard } from "@/components/magazine/list-card";
import { Pagination } from "@/components/archive/pagination";

interface ArchivePageProps {
  searchParams: Promise<{
    page?: string;
    sort?: "newest" | "trending" | "oldest";
  }>;
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const { page: pageParam, sort = "newest" } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);

  const { posts, totalCount, totalPages, currentPage } = await getAllPosts({
    page,
    sort,
    limit: 10,
  });

  return (
    <div className="mx-auto max-w-4xl pb-12">
      {/* Header */}
      <div className="mb-12 border-b-4 border-black pb-8 dark:border-white">
        <h1 className="font-serif text-4xl font-black tracking-tight md:text-5xl">
          Archive
        </h1>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {totalCount} {totalCount === 1 ? "story" : "stories"} in the archives
          </p>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
            <span className="text-muted-foreground">Sort:</span>
            <Link
              href="/archive?sort=newest"
              className={
                sort === "newest"
                  ? "font-bold underline"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              Newest
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link
              href="/archive?sort=trending"
              className={
                sort === "trending"
                  ? "font-bold underline"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              Trending
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link
              href="/archive?sort=oldest"
              className={
                sort === "oldest"
                  ? "font-bold underline"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              Oldest
            </Link>
          </div>
        </div>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="py-12 text-center font-serif text-lg italic text-muted-foreground">
          No stories in the archives yet.
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {posts.map(({ post, author }) => (
            <ListCard key={post.id} post={{ ...post, author }} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          sort={sort}
        />
      )}
    </div>
  );
}
