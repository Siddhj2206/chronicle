import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { BookmarkButton } from "@/components/posts/bookmark-button";

import type { Post, User } from "@/lib/db/schema";

export interface StoryCardProps {
  post: Post & { author: Pick<User, "id" | "name" | "username" | "image"> };
  className?: string;
}

export function StoryCard({
  post,
  className,
  lead = false,
}: StoryCardProps & { lead?: boolean }): React.JSX.Element {
  const href = `/@${post.author.username}/${post.slug}`;
  const Heading = lead ? "h2" : "h3";
  return (
    <article className={cn("story", lead && "story-lead", className)}>
      <Link
        className="story-cover"
        href={href}
        aria-label={post.title || "Read story"}
      >
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt=""
            fill
            sizes={
              lead
                ? "(max-width: 640px) 100vw, 60vw"
                : "(max-width: 640px) 100vw, 50vw"
            }
            priority={lead}
          />
        ) : (
          <span className="title-initial" aria-hidden="true">
            {Array.from(post.title.trim())[0]?.toLocaleUpperCase("en-US") ||
              "C"}
          </span>
        )}
      </Link>
      {post.publishedAt && (
        <time
          className="story-meta story-date"
          dateTime={post.publishedAt.toISOString()}
        >
          {post.publishedAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </time>
      )}
      <div className="story-copy">
        <div className="story-meta story-byline flex items-center justify-between gap-3">
          <Link
            href={`/@${post.author.username}`}
            className="min-w-0 truncate"
            title={post.author.name}
          >
            {post.author.name}
          </Link>
          <BookmarkButton postId={post.id} compact />
        </div>
        <Link href={href}>
          <Heading className="story-title">{post.title}</Heading>
        </Link>
        {post.excerpt && <p className="story-excerpt">{post.excerpt}</p>}
      </div>
    </article>
  );
}
