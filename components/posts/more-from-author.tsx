import { StoryCard } from "@/components/magazine/story-card";

import type { Post, User } from "@/lib/db/schema";

export function MoreFromAuthor({
  posts,
  author,
}: {
  posts: Post[];
  author: Pick<User, "id" | "name" | "username" | "image">;
}): React.JSX.Element | null {
  if (!posts.length) return null;
  return (
    <section
      aria-label={`More from ${author.name}`}
      className="mt-16 border-t border-border pt-8 md:mt-24"
    >
      <h2 className="mb-8 font-serif text-4xl leading-tight md:text-5xl">
        More from {author.name}
      </h2>
      <div className="grid items-start gap-x-8 gap-y-12 md:grid-cols-[1.4fr_1fr]">
        {posts.map((post, index) => (
          <StoryCard
            key={post.id}
            post={{ ...post, author }}
            className={
              index === 0 && posts.length > 1 ? "md:row-span-2" : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
