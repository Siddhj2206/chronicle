import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { TagChips } from "@/components/posts/tag-chips";

import type { Post, User } from "@/lib/db/schema";

export interface StoryCardProps {
  post: Post & {
    responseCount?: number;
    author: Pick<User, "id" | "name" | "username" | "image">;
  };
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
        <div className="story-meta story-byline">
          <Link href={`/@${post.author.username}`}>{post.author.name}</Link>
        </div>
        <Link href={href}>
          <Heading className="story-title">{post.title}</Heading>
        </Link>
        {post.excerpt && <p className="story-excerpt">{post.excerpt}</p>}
        <TagChips tags={post.tags} />
        {post.responseCount !== undefined && (
          <Link
            href={`${href}#responses`}
            className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
          >
            {post.responseCount}{" "}
            {post.responseCount === 1 ? "response" : "responses"}
          </Link>
        )}
      </div>
    </article>
  );
}
