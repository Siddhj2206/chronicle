import Link from "next/link";

import { getSession } from "@/lib/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentContent } from "@/components/comments/comment-content";
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
      <p className="py-12 text-center font-serif italic text-muted-foreground">
        No letters have been received for this article.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {comments.map(({ comment, author }, index) => {
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
            month: "long",
            day: "numeric",
            year: "numeric",
          }
        );

        return (
          <article
            key={comment.id}
            className={index > 0 ? "border-t border-neutral-300 pt-8 dark:border-neutral-700" : ""}
          >
            <header className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 rounded-none border border-neutral-300 dark:border-neutral-700">
                  <AvatarImage src={author.image || undefined} alt={author.name || "User avatar"} />
                  <AvatarFallback className="rounded-none font-mono text-xs">
                    {initials || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={`/@${author.username}`}
                      className="font-serif font-bold hover:underline"
                    >
                      {author.name}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">
                      @{author.username}
                    </span>
                  </div>
                  <time
                    dateTime={comment.createdAt.toISOString()}
                    className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    Published: {formattedDate}
                  </time>
                </div>
              </div>
              {canDelete && <DeleteCommentButton commentId={comment.id} />}
            </header>
            <div className="prose prose-sm prose-neutral dark:prose-invert ml-16 font-serif italic">
              <span className="text-muted-foreground">&ldquo;</span>
              <CommentContent content={comment.content} />
              <span className="text-muted-foreground">&rdquo;</span>
            </div>
            {index < comments.length - 1 && <div className="pb-8" />}
          </article>
        );
      })}
    </div>
  );
}
