import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import type { Post } from "@/lib/db/schema";

interface PostCardProps {
  post: Post;
  author: {
    name: string | null;
    username: string | null;
    image: string | null;
  };
}

export function PostCard({ post, author }: PostCardProps) {
  const initials = author.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:rotate-1 hover:shadow-lg">
      {post.coverImage && (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-2">
        <Link
          href={`/@${author.username}/${post.slug}`}
          className="transition-colors hover:text-primary"
        >
          <h2 className="font-serif text-lg font-medium leading-tight">
            {post.title}
          </h2>
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {post.excerpt && (
          <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center justify-between">
          <Link
            href={`/@${author.username}`}
            className="flex items-center gap-2 transition-colors hover:text-primary"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={author.image || undefined} />
              <AvatarFallback className="text-xs">{initials || "U"}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{author.name}</span>
          </Link>
          {formattedDate && (
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
