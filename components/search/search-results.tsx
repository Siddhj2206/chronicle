"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/magazine/list-card";
import { searchPosts } from "@/actions/search";

import type { SearchResult, SearchParams } from "@/actions/search";

// ============================================
// Types
// ============================================

interface SearchResultsProps {
  initialResults: SearchResult;
  searchParams: SearchParams;
}

// ============================================
// Search Results Component
// ============================================

export function SearchResults({
  initialResults,
  searchParams,
}: SearchResultsProps) {
  const [results, setResults] = useState(initialResults.posts);
  const [hasMore, setHasMore] = useState(initialResults.hasMore);
  const [cursor, setCursor] = useState(initialResults.nextCursor);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    if (!cursor || isPending) return;

    startTransition(async () => {
      const more = await searchPosts({
        ...searchParams,
        cursor,
      });

      setResults((prev) => [...prev, ...more.posts]);
      setHasMore(more.hasMore);
      setCursor(more.nextCursor);
    });
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Results List */}
      <div className="flex flex-col gap-12">
        {results.map(({ post, author }) => (
          <ListCard key={post.id} post={{ ...post, author }} />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-12 flex justify-center border-t border-border pt-8">
          <Button
            onClick={loadMore}
            disabled={isPending}
            variant="outline"
            className="rounded-none border-2 border-black px-8 py-6 font-mono text-xs font-bold uppercase tracking-widest dark:border-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More Stories"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
