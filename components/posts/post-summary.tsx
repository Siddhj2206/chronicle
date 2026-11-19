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
  return (
    <div className="my-2 space-y-2 text-muted-foreground">
      {variant !== "compact" && post.subtitle && (
        <p
          className={cn(
            "font-serif leading-relaxed",
            variant === "article"
              ? "mx-auto max-w-2xl text-xl italic md:text-2xl"
              : "text-lg",
          )}
        >
          {post.subtitle}
        </p>
      )}
      <p className="font-mono text-xs tracking-wide">
        {post.readingTimeMinutes ?? readingTimeMinutes(post.content)} min read
      </p>
    </div>
  );
}
