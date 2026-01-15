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

export function HeroCard({ post, className }: HeroCardProps) {
  return (
    <article className={cn("group grid grid-cols-1 gap-6 border-b-4 border-black pb-8 dark:border-white md:grid-cols-12 md:gap-12", className)}>
      <div className="md:col-span-8">
        <Link href={`/@${post.author.username}/${post.slug}`} className="block overflow-hidden">
          <div className="relative aspect-[16/9] w-full bg-muted transition-transform duration-500 group-hover:scale-[1.01]">
             {post.coverImage ? (
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 66vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-neutral-100 text-neutral-300 dark:bg-neutral-800 dark:text-neutral-600">
                  <span className="text-4xl font-black uppercase tracking-tighter">Chronicle</span>
                </div>
              )}
          </div>
        </Link>
      </div>
      <div className="flex flex-col justify-center md:col-span-4">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Link href={`/@${post.author.username}`} className="hover:text-foreground hover:underline">
            {post.author.name}
          </Link>
          <span>•</span>
          <time dateTime={post.publishedAt?.toISOString()}>
            {post.publishedAt?.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>
        <Link href={`/@${post.author.username}/${post.slug}`} className="group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
          <h2 className="mb-4 font-serif text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            {post.title}
          </h2>
          <p className="font-serif text-lg leading-relaxed text-muted-foreground md:text-xl">
            {post.excerpt}
          </p>
        </Link>
      </div>
    </article>
  );
}
