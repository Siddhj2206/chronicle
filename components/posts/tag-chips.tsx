import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import type { Tag } from "@/lib/db/schema";

export function TagChips({ tags = [] }: { tags?: Tag[] }) {
  if (!tags.length) return null;
  return (
    <div
      className="my-4 flex min-w-0 max-w-full flex-wrap gap-2 font-sans"
      aria-label="Topics"
    >
      {tags.map((tag) => (
        <span key={tag.id} className="min-w-0 max-w-full">
          <Badge variant="outline" asChild>
            <Link
              href={`/tag/${encodeURIComponent(tag.slug)}`}
              title={tag.name}
              className="min-w-0 max-w-full"
            >
              <span className="truncate">{tag.name}</span>
            </Link>
          </Badge>
        </span>
      ))}
    </div>
  );
}
