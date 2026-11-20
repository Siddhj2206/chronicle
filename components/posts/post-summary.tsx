import { readingTimeMinutes } from "@/lib/reading-time";
import { cn } from "@/lib/utils";

import type { ReactElement } from "react";

import type { Post } from "@/lib/db/schema";

interface PostSummaryProps {
  post: Post;
  variant?: "card" | "article" | "compact";
}

export function PostSummary({
  post,
  variant = "card",
}: PostSummaryProps): ReactElement {
  const description =
    post.subtitle || (variant === "article" ? post.excerpt : null);
  return (
    <div
      className={cn(
        "space-y-2 text-muted-foreground",
        variant === "article" && "reader-deck",
        variant !== "article" && "my-2",
      )}
    >
      {variant !== "compact" && description && (
        <p className={cn(variant !== "article" && "story-excerpt")}>
          {description}
        </p>
      )}
      <p className="story-meta">
        {post.readingTimeMinutes ?? readingTimeMinutes(post.content)} min read
      </p>
    </div>
  );
}
