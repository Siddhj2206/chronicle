import { readingTimeMinutes } from "@/lib/reading-time";

import type { Post } from "@/lib/db/schema";

export function PostSummary({ post }: { post: Post }) {
  return (
    <div className="my-2 space-y-2 text-muted-foreground">
      {post.subtitle && <p className="font-serif text-lg leading-relaxed">{post.subtitle}</p>}
      <p className="font-mono text-xs tracking-wide">
        {post.readingTimeMinutes ?? readingTimeMinutes(post.content)} min read
      </p>
    </div>
  );
}
