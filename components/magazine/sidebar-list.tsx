import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Post, User } from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SidebarListProps {
  title: string;
  posts: (Post & {
    author: Pick<User, "id" | "name" | "username" | "image">;
  })[];
  className?: string;
}

export function SidebarList({ title, posts, className }: SidebarListProps) {
  return (
    <Card className={cn("rounded-none border-0 bg-transparent shadow-none", className)}>
      <CardHeader className="border-b border-black px-0 pb-2 dark:border-white">
        <CardTitle className="font-sans text-xs font-black uppercase tracking-widest">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-0 pt-6">
        {posts.map((post, i) => (
          <div key={post.id} className="group flex flex-col gap-1">
            <span className="font-mono text-xs text-muted-foreground/50">
              {String(i + 1).padStart(2, "0")}
            </span>
            <Link href={`/@${post.author.username}/${post.slug}`} className="group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
              <h4 className="font-serif text-base font-bold leading-snug">
                {post.title}
              </h4>
            </Link>
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Link href={`/@${post.author.username}`} className="hover:underline">
                {post.author.name}
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
