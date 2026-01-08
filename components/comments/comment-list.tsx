import Link from "next/link";

import { getSession } from "@/lib/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostContent } from "@/components/posts/post-content";
import { getComments } from "@/actions/comments";
import { DeleteCommentButton } from "./delete-comment-button";

interface CommentListProps {
  postId: string;
  postAuthorId: string;
}

export async function CommentList({ postId, postAuthorId }: CommentListProps) {
  const session = await getSession();
  const comments = await getComments(postId);

  if (comments.length === 0) {
    return (
      <p className="py-8 text-center font-serif italic text-muted-foreground">
        No comments yet. Be the first to share your thoughts.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {comments.map(({ comment, author }) => {
        const initials = author.name
          ?.split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const canDelete =
          session?.user?.id === author.id ||
          session?.user?.id === postAuthorId;

        const formattedDate = new Date(comment.createdAt).toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            year: "numeric",
          }
        );

        return (
          <article key={comment.id} className="py-6">
            <header className="mb-3 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={author.image || undefined} />
                  <AvatarFallback className="font-serif text-sm">
                    {initials || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <Link
                    href={`/@${author.username}`}
                    className="font-serif font-semibold hover:underline"
                  >
                    {author.name}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>@{author.username}</span>
                    <span>•</span>
                    <time dateTime={comment.createdAt.toISOString()}>
                      {formattedDate}
                    </time>
                  </div>
                </div>
              </div>
              {canDelete && <DeleteCommentButton commentId={comment.id} />}
            </header>
            <div className="prose prose-sm prose-neutral dark:prose-invert pl-13 font-serif">
              <PostContent content={comment.content} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
