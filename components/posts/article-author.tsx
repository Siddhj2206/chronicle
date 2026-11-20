import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

import type { User } from "@/lib/db/schema";

type ArticleAuthor = Pick<User, "name" | "username" | "image" | "bio">;

function AuthorPortrait({
  author,
  small = false,
}: {
  author: ArticleAuthor;
  small?: boolean;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-muted font-serif",
        small ? "size-10 text-2xl" : "size-16 text-4xl",
      )}
    >
      {author.image ? (
        <Image
          src={author.image}
          alt=""
          fill
          sizes={small ? "40px" : "64px"}
          className="object-cover"
        />
      ) : (
        <span aria-hidden="true">
          {Array.from(author.name.trim())[0] || "C"}
        </span>
      )}
    </span>
  );
}

export function ArticleByline({
  author,
  date,
  minutes,
}: {
  author: ArticleAuthor;
  date: Date | null;
  minutes: number;
}): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label="Story byline"
      className="flex items-center gap-3 text-[13px] leading-relaxed md:col-start-2"
    >
      <Link
        href={`/@${author.username}`}
        aria-label={`View ${author.name}'s profile`}
      >
        <AuthorPortrait author={author} small />
      </Link>
      <div>
        <Link href={`/@${author.username}`} className="hover:underline">
          {author.name}
        </Link>
        <div className="flex flex-wrap gap-x-3 text-muted-foreground">
          {date && (
            <time dateTime={date.toISOString()}>
              {date.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          )}
          <span>{minutes} min read</span>
        </div>
      </div>
    </div>
  );
}

export function ArticleAuthorCard({
  author,
}: {
  author: ArticleAuthor;
}): React.JSX.Element {
  return (
    <footer className="reader-author max-w-[680px] !items-start">
      <Link
        href={`/@${author.username}`}
        aria-label={`View ${author.name}'s profile`}
      >
        <AuthorPortrait author={author} />
      </Link>
      <div className="min-w-0">
        <p className="mb-2 text-xs text-muted-foreground">Written by</p>
        <h2>
          <Link href={`/@${author.username}`} className="hover:underline">
            {author.name}
          </Link>
        </h2>
        {author.bio && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {author.bio}
          </p>
        )}
        <Link
          href={`/@${author.username}`}
          className="mt-4 inline-block text-sm underline underline-offset-4"
        >
          View profile
        </Link>
      </div>
    </footer>
  );
}
