import Link from "next/link";

import { cn } from "@/lib/utils";
import { PostSummary } from "@/components/posts/post-summary";

import type { Post, User } from "@/lib/db/schema";

interface SidebarListProps {
  title: string;
  posts: (Post & {
    author: Pick<User, "id" | "name" | "username" | "image">;
  })[];
  className?: string;
  layout?: "rail";
}

export function SidebarList({
  title,
  posts,
  className,
  layout,
}: SidebarListProps): React.JSX.Element {
  return (
    <aside
      className={cn(
        "reading-list",
        layout === "rail" && "!mt-0 !border-0 !pt-0",
        className,
      )}
    >
      <h2>{title}</h2>
      <div
        className={cn(
          "reading-list-items",
          layout === "rail" && "!grid-cols-1",
        )}
      >
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
            <PostSummary post={post} variant="compact" />
          </div>
        ))}
      </div>
    </aside>
  );
}
