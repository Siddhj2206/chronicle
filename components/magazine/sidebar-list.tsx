import Link from "next/link";

import { cn } from "@/lib/utils";

import type { Post, User } from "@/lib/db/schema";

interface SidebarListProps {
  title: string;
  posts: (Post & {
    author: Pick<User, "id" | "name" | "username" | "image">;
  })[];
  className?: string;
}

export function SidebarList({
  title,
  posts,
  className,
}: SidebarListProps): React.JSX.Element {
  return (
    <aside className={cn("rounded-lg bg-card p-6", className)}>
      <h2 className="mb-6 font-sans text-sm font-medium text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-7">
        {posts.map((post) => (
          <div key={post.id}>
            <Link
              href={`/@${post.author.username}/${post.slug}`}
              className="hover:text-primary"
            >
              <h3 className="font-serif text-xl font-normal leading-snug">
                {post.title}
              </h3>
            </Link>
            <Link
              href={`/@${post.author.username}`}
              className="mt-2 inline-block font-sans text-label text-muted-foreground hover:text-primary"
            >
              {post.author.name}
            </Link>
          </div>
        ))}
      </div>
    </aside>
  );
}
