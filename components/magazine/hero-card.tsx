import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

import type { Post, User } from "@/lib/db/schema";

interface HeroCardProps {
  post: Post & {
    author: Pick<User, "id" | "name" | "username" | "image">;
  };
  className?: string;
}

export function HeroCard({
  post,
  className,
}: HeroCardProps): React.JSX.Element {
  return (
    <article
      className={cn(
        "grid gap-8 rounded-lg bg-card p-6 md:gap-12 md:p-10",
        post.coverImage && "md:grid-cols-2 md:items-center",
        className,
      )}
    >
      {post.coverImage && (
        <Link
          href={`/@${post.author.username}/${post.slug}`}
          className="relative block aspect-[4/3] overflow-hidden rounded-lg"
        >
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </Link>
      )}
      <div className={cn("max-w-3xl", !post.coverImage && "py-4 md:py-8")}>
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-label text-muted-foreground">
          <Link
            href={`/@${post.author.username}`}
            className="hover:text-primary"
          >
            {post.author.name}
          </Link>
          <span aria-hidden="true">·</span>
          <time dateTime={post.publishedAt?.toISOString()}>
            {post.publishedAt?.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>
        <Link href={`/@${post.author.username}/${post.slug}`} className="group">
          <h2 className="font-serif text-3xl font-normal leading-tight group-hover:text-primary md:text-5xl">
            {post.title}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            {post.excerpt}
          </p>
        </Link>
      </div>
    </article>
  );
}
