import Link from "next/link";

import { getSession } from "@/lib/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentContent } from "@/components/comments/comment-content";
import { getComments } from "@/actions/comments";
import { DeleteCommentButton } from "@/components/comments/delete-comment-button";

interface CommentListProps {
  postId: string;
  postAuthorId: string;
}

export async function CommentList({
  postId,
  postAuthorId,
}: CommentListProps): Promise<React.JSX.Element> {
  const session = await getSession();
  const comments = await getComments(postId);

  if (comments.length === 0) {
    return <p className="comment-empty">The conversation starts here.</p>;
  }

  return (
    <div className="space-y-0">
      {comments.map(({ comment, author }) => {
        const initials = author.name
          ?.split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const canDelete =
          session?.user?.id === author.id || session?.user?.id === postAuthorId;

        const formattedDate = new Date(comment.createdAt).toLocaleDateString(
          "en-US",
          {
            month: "long",
            day: "numeric",
            year: "numeric",
          },
        );

        return (
          <article key={comment.id} className="comment-entry">
            <header>
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarImage
                    src={author.image || undefined}
                    alt={author.name || "User avatar"}
                  />
                  <AvatarFallback>{initials || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="comment-byline">
                    <Link
                      href={`/@${author.username}`}
                      className="hover:underline"
                    >
                      {author.name}
                    </Link>
                    <span>@{author.username}</span>
                  </div>
                  <time dateTime={comment.createdAt.toISOString()}>
                    {formattedDate}
                  </time>
                </div>
              </div>
              {canDelete && <DeleteCommentButton commentId={comment.id} />}
            </header>
            <div>
              <CommentContent content={comment.content} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
