import { notFound } from "next/navigation";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PostContent } from "@/components/posts/post-content";
import { getPost } from "@/actions/posts";

interface PostPageProps {
  params: Promise<{ username: string; slug: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { username, slug } = await params;

  // Remove @ prefix if present
  const cleanUsername = username.startsWith("%40")
    ? username.slice(3)
    : username.startsWith("@")
      ? username.slice(1)
      : username;

  const result = await getPost(cleanUsername, slug);

  if (!result || !result.post.published) {
    notFound();
  }

  const { post, author } = result;

  const initials = author.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <article className="mx-auto max-w-2xl">
      {/* Cover Image */}
      {post.coverImage && (
        <div className="mb-8 aspect-[2/1] overflow-hidden rounded-lg">
          <img
            src={post.coverImage}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Header */}
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold leading-tight md:text-4xl">
          {post.title}
        </h1>

        <div className="mt-6 flex items-center justify-between">
          <Link
            href={`/@${author.username}`}
            className="flex items-center gap-3 transition-colors hover:text-primary"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={author.image || undefined} />
              <AvatarFallback>{initials || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{author.name}</div>
              <div className="text-sm text-muted-foreground">@{author.username}</div>
            </div>
          </Link>
          {formattedDate && (
            <time className="text-sm text-muted-foreground">{formattedDate}</time>
          )}
        </div>
      </header>

      <Separator className="mb-8" />

      {/* Content */}
      <div className="prose prose-neutral max-w-none">
        <PostContent content={post.content} />
      </div>
    </article>
  );
}
