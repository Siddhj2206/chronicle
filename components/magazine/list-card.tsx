import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Post, User } from "@/lib/db/schema";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface ListCardProps {
  post: Post & {
    author: Pick<User, "id" | "name" | "username" | "image">;
  };
  className?: string;
}

export function ListCard({ post, className }: ListCardProps) {
  return (
    <Card className={cn("group flex flex-col gap-6 rounded-none border-0 bg-transparent shadow-none md:flex-row md:items-start", className)}>
      <div className="w-full shrink-0 md:w-1/3">
        <Link href={`/@${post.author.username}/${post.slug}`} className="block overflow-hidden">
          <div className="relative aspect-[3/2] w-full bg-muted transition-transform duration-500 group-hover:scale-[1.01]">
            {post.coverImage ? (
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-neutral-100 text-neutral-300 dark:bg-neutral-800 dark:text-neutral-600">
                <span className="text-lg font-black uppercase tracking-tighter">Chronicle</span>
              </div>
            )}
          </div>
        </Link>
      </div>
      <CardContent className="flex-1 p-0">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Link href={`/@${post.author.username}`} className="hover:text-foreground hover:underline">
            {post.author.name}
          </Link>
          <span>•</span>
          <time dateTime={post.publishedAt?.toISOString()}>
            {post.publishedAt?.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>
        <Link href={`/@${post.author.username}/${post.slug}`} className="group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
          <h3 className="mb-2 font-serif text-2xl font-bold leading-tight">
            {post.title}
          </h3>
          <p className="line-clamp-2 font-serif text-base leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        </Link>
      </CardContent>
    </Card>
  );
}
