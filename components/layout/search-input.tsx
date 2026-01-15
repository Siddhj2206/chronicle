"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

function SearchInputContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [isOpen, setIsOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  }

  // Mobile: show icon that expands to input
  if (isMobile) {
    if (!isOpen) {
      return (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsOpen(true)}
          aria-label="Open search"
        >
          <Search className="h-4 w-4" />
        </Button>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-32"
          onBlur={() => {
            if (!query.trim()) setIsOpen(false);
          }}
        />
      </form>
    );
  }

  // Desktop: show full input
  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="search"
        placeholder="Search posts…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-64"
      />
    </form>
  );
}

export function SearchInput() {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-8 md:h-10 md:w-64" />}>
      <SearchInputContent />
    </Suspense>
  );
}
