import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

import type { Post, User } from "@/lib/db/schema";

interface ListCardProps {
  post: Post & {
    author: Pick<User, "id" | "name" | "username" | "image">;
  };
  className?: string;
}

export function ListCard({
  post,
  className,
}: ListCardProps): React.JSX.Element {
  return (
    <article
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-start",
        className,
      )}
    >
      {post.coverImage && (
        <Link
          href={`/@${post.author.username}/${post.slug}`}
          className="relative block aspect-[3/2] w-full shrink-0 overflow-hidden rounded-lg md:w-1/3"
        >
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </Link>
      )}
      <div className="flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-label text-muted-foreground">
          <Link
            href={`/@${post.author.username}`}
            className="hover:text-primary"
          >
            {post.author.name}
          </Link>
          <span aria-hidden="true">·</span>
          <time dateTime={post.publishedAt?.toISOString()}>
            {post.publishedAt?.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>
        <Link href={`/@${post.author.username}/${post.slug}`} className="group">
          <h3 className="font-serif text-2xl font-normal leading-snug group-hover:text-primary">
            {post.title}
          </h3>
          <p className="mt-3 line-clamp-2 text-lg leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        </Link>
      </div>
    </article>
  );
}
