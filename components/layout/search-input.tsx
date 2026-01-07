"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

import { Input } from "@/components/ui/input";

function SearchInputContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="search"
        placeholder="Search posts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-64"
      />
    </form>
  );
}

export function SearchInput() {
  return (
    <Suspense fallback={<div className="w-64 h-10 animate-pulse rounded-md bg-muted" />}>
      <SearchInputContent />
    </Suspense>
  );
}
