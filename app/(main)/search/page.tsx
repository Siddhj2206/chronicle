import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { searchPosts } from "@/actions/search";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchResults } from "@/components/search/search-results";

import type { Metadata } from "next";
import type { DatePreset, SearchParams } from "@/actions/search";

// ============================================
// Metadata
// ============================================

export const metadata: Metadata = {
  title: "Search | Chronicle",
  description: "Search through all published stories on Chronicle",
};

// ============================================
// Page Props
// ============================================

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    author?: string;
    date?: DatePreset;
  }>;
}

// ============================================
// Loading Skeleton
// ============================================

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-12">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-6">
          <Skeleton className="h-32 w-48 shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// No Results Component
// ============================================

function NoResults({
  query,
  hasFilters,
}: {
  query: string;
  hasFilters: boolean;
}) {
  return (
    <div className="py-12 text-center">
      <p className="font-serif text-lg italic text-muted-foreground">
        No stories found matching your query.
      </p>
      {hasFilters && (
        <Button
          variant="outline"
          className="mt-6 rounded-none border-2 border-black font-mono text-xs uppercase tracking-widest dark:border-white"
          asChild
        >
          <Link href={`/search?q=${encodeURIComponent(query)}`}>
            Clear Filters
          </Link>
        </Button>
      )}
    </div>
  );
}

// ============================================
// Empty State Component
// ============================================

function EmptyState() {
  return (
    <div className="py-12 text-center font-serif text-lg italic text-muted-foreground">
      Type above to search the archives…
    </div>
  );
}

// ============================================
// Search Page
// ============================================

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, author, date } = await searchParams;
  const query = q || "";

  // Build search params object
  const params: SearchParams = {
    query,
    author,
    datePreset: date,
    limit: 10,
  };

  // Check if any filters are active
  const hasFilters = !!(author || date);

  // Fetch initial results (only if there's a query)
  const initialResults = query
    ? await searchPosts(params)
    : { posts: [], hasMore: false, nextCursor: null };

  return (
    <div className="mx-auto max-w-4xl pb-12">
      {/* Header */}
      <div className="mb-8 border-b-4 border-black pb-8 dark:border-white">
        <h1 className="font-serif text-4xl font-black tracking-tight md:text-5xl">
          Search
        </h1>
        {query && (
          <p className="mt-4 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Showing results for{" "}
            <span className="text-foreground">&quot;{query}&quot;</span>
            {hasFilters && (
              <span className="ml-2 text-muted-foreground">
                (with filters applied)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Filters - only show when there's a query */}
      {query && (
        <Suspense fallback={<Skeleton className="mb-8 h-12 w-full" />}>
          <SearchFilters
            query={query}
            currentAuthor={author}
            currentDate={date}
          />
        </Suspense>
      )}

      {/* Results */}
      {!query ? (
        <EmptyState />
      ) : initialResults.posts.length === 0 ? (
        <NoResults query={query} hasFilters={hasFilters} />
      ) : (
        <Suspense fallback={<ResultsSkeleton />}>
          <SearchResults initialResults={initialResults} searchParams={params} />
        </Suspense>
      )}
    </div>
  );
}
