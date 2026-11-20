import Image from "next/image";
import Link from "next/link";

import { StoryCard } from "@/components/magazine/story-card";
import { TagChips } from "@/components/posts/tag-chips";
import { BookmarkButton } from "@/components/posts/bookmark-button";
import { analyzeReading } from "@/lib/reading";
import { cn } from "@/lib/utils";

import type { StoryCardProps } from "@/components/magazine/story-card";

export function ListCard({
  layout,
  ...props
}: StoryCardProps & { layout?: "feed" }): React.JSX.Element {
  if (layout === "feed") return <FeedStory {...props} />;
  return <StoryCard {...props} />;
}

function FeedStory({ post, className }: StoryCardProps): React.JSX.Element {
  const href = `/@${post.author.username}/${post.slug}`;
  const minutes = analyzeReading(post.content).minutes;
  return (
    <article
      data-feed-story
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_80px] gap-x-5 border-b border-border py-8 sm:grid-cols-[minmax(0,1fr)_144px] sm:gap-x-8",
        className,
      )}
    >
      <Link
        href={`/@${post.author.username}`}
        className="col-start-1 flex items-center gap-2 text-xs hover:underline"
      >
        <span className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden bg-muted font-serif text-lg">
          {post.author.image ? (
            <Image
              src={post.author.image}
              alt=""
              fill
              sizes="24px"
              className="object-cover"
            />
          ) : (
            <span aria-hidden="true">
              {Array.from(post.author.name.trim())[0] || "C"}
            </span>
          )}
        </span>
        {post.author.name}
      </Link>
      <div className="col-start-1 mt-3 min-w-0">
        <Link href={href} className="hover:text-primary">
          <h3 className="font-serif text-[28px] leading-[1.1] tracking-tight [overflow-wrap:anywhere] sm:text-[34px]">
            {post.title || "Untitled story"}
          </h3>
        </Link>
        {post.excerpt && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {post.publishedAt && (
            <time dateTime={post.publishedAt.toISOString()}>
              {post.publishedAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          )}
          <span>{minutes} min read</span>
          {post.responseCount !== undefined && (
            <Link href={`${href}#responses`} className="hover:text-foreground">
              {post.responseCount}{" "}
              {post.responseCount === 1 ? "response" : "responses"}
            </Link>
          )}
          <BookmarkButton postId={post.id} compact />
        </div>
        <TagChips tags={post.tags} />
      </div>
      <Link
        href={href}
        aria-label={post.title || "Read story"}
        className="relative col-start-2 row-start-1 row-span-2 flex size-20 items-center justify-center self-center overflow-hidden bg-muted sm:h-28 sm:w-36"
      >
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt=""
            fill
            sizes="(max-width: 640px) 80px, 144px"
            className="object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="font-serif text-5xl text-primary sm:text-7xl"
          >
            {Array.from(post.title.trim())[0]?.toLocaleUpperCase("en-US") ||
              "C"}
          </span>
        )}
      </Link>
    </article>
  );
}
