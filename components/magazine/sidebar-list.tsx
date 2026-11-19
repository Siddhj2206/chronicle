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
    <aside className={cn("reading-list", className)}>
      <h2>{title}</h2>
      <div className="reading-list-items">
        {posts.map((post) => (
          <div key={post.id}>
            <Link
              href={`/@${post.author.username}/${post.slug}`}
              className="hover:text-primary"
            >
              <h3>{post.title}</h3>
            </Link>
            <Link
              href={`/@${post.author.username}`}
              className="story-meta hover:text-primary"
            >
              {post.author.name}
            </Link>
          </div>
        ))}
      </div>
    </aside>
  );
}
