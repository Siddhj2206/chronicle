"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronsUpDown, Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getAuthorsWithPosts } from "@/actions/search";

import type { AuthorWithPosts, DatePreset } from "@/actions/search";

// ============================================
// Types
// ============================================

interface SearchFiltersProps {
  query: string;
  currentAuthor?: string;
  currentDate?: DatePreset;
}

// ============================================
// Date Preset Options
// ============================================

const DATE_PRESETS: Array<{ value: DatePreset | undefined; label: string }> = [
  { value: undefined, label: "Any time" },
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "year", label: "Last year" },
];

// ============================================
// Search Filters Component
// ============================================

export function SearchFilters({
  query,
  currentAuthor,
  currentDate,
}: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [authors, setAuthors] = useState<AuthorWithPosts[]>([]);
  const [authorOpen, setAuthorOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if any filters are active
  const hasFilters = !!(currentAuthor || currentDate);

  // Fetch authors on mount
  useEffect(() => {
    async function fetchAuthors() {
      setIsLoading(true);
      const result = await getAuthorsWithPosts();
      setAuthors(result);
      setIsLoading(false);
    }
    fetchAuthors();
  }, []);

  // Build URL with updated params
  const buildUrl = useCallback(
    (updates: { author?: string | null; date?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update author param
      if (updates.author === null) {
        params.delete("author");
      } else if (updates.author !== undefined) {
        params.set("author", updates.author);
      }

      // Update date param
      if (updates.date === null) {
        params.delete("date");
      } else if (updates.date !== undefined) {
        params.set("date", updates.date);
      }

      // Ensure query is preserved
      if (query && !params.has("q")) {
        params.set("q", query);
      }

      return `/search?${params.toString()}`;
    },
    [searchParams, query]
  );

  // Handle author selection
  const handleAuthorChange = (username: string | null) => {
    setAuthorOpen(false);
    router.push(buildUrl({ author: username }));
  };

  // Handle date preset selection
  const handleDateChange = (preset: DatePreset | undefined) => {
    router.push(buildUrl({ date: preset || null }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  // Get selected author display name
  const selectedAuthor = authors.find((a) => a.username === currentAuthor);

  // ============================================
  // Filter Content (shared between mobile/desktop)
  // ============================================

  const filterContent = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      {/* Author Filter */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Author:
        </span>
        <Popover open={authorOpen} onOpenChange={setAuthorOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={authorOpen}
              className="w-[200px] justify-between rounded-none border-2 border-black font-mono text-xs dark:border-white"
            >
              {selectedAuthor ? (
                <span className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={selectedAuthor.image || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {selectedAuthor.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  {selectedAuthor.name}
                </span>
              ) : (
                "Filter by author..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] rounded-none p-0" align="start">
            <Command className="rounded-none">
              <CommandInput placeholder="Search authors..." className="rounded-none" />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "Loading authors..." : "No authors found."}
                </CommandEmpty>
                <CommandGroup>
                  {/* Clear selection option */}
                  {currentAuthor && (
                    <CommandItem
                      value=""
                      onSelect={() => handleAuthorChange(null)}
                      className="rounded-none"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear author filter
                    </CommandItem>
                  )}
                  {/* Author list */}
                  {authors.map((author) => (
                    <CommandItem
                      key={author.username}
                      value={author.username}
                      onSelect={() => handleAuthorChange(author.username)}
                      className="rounded-none"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          currentAuthor === author.username
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <Avatar className="mr-2 h-6 w-6">
                        <AvatarImage src={author.image || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {author.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1">{author.name}</span>
                      <span className="text-muted-foreground">
                        {author.postCount} {author.postCount === 1 ? "post" : "posts"}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Date:
        </span>
        <div className="flex gap-1">
          {DATE_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant={currentDate === preset.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleDateChange(preset.value)}
              className={cn(
                "rounded-none font-mono text-xs",
                currentDate === preset.value
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "border-2 border-black dark:border-white"
              )}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="rounded-none font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="mr-1 h-3 w-3" />
          Clear filters
        </Button>
      )}
    </div>
  );

  // ============================================
  // Render
  // ============================================

  return (
    <div className="mb-8">
      {/* Mobile: Collapsible filters */}
      <div className="sm:hidden">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-between rounded-none border-2 border-black font-mono text-xs dark:border-white",
                hasFilters && "bg-black text-white dark:bg-white dark:text-black"
              )}
            >
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {hasFilters && (
                  <span className="rounded-none bg-white px-1.5 text-black dark:bg-black dark:text-white">
                    {[currentAuthor, currentDate].filter(Boolean).length}
                  </span>
                )}
              </span>
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 border-2 border-black p-4 dark:border-white">
            {filterContent}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Desktop: Always visible filters */}
      <div className="hidden sm:block">
        <div className="border-b border-border pb-4">
          {filterContent}
        </div>
      </div>
    </div>
  );
}
