import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import type { Tag } from "@/lib/db/schema";

export function TagChips({ tags = [] }: { tags?: Tag[] }) {
  if (!tags.length) return null;
  return (
    <div className="my-4 flex flex-wrap gap-2" aria-label="Topics">
      {tags.map((tag) => <Badge key={tag.id} variant="secondary" asChild><Link href={`/tag/${encodeURIComponent(tag.slug)}`}>{tag.name}</Link></Badge>)}
    </div>
  );
}
