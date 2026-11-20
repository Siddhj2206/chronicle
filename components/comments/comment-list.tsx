import Link from "next/link";

import { Heart } from "lucide-react";

import { getComments } from "@/actions/comments";
import { CommentContent } from "@/components/comments/comment-content";
import { DeleteCommentButton } from "@/components/comments/delete-comment-button";
import {
  AuthorLikeControl,
  ReplyControl,
} from "@/components/comments/response-controls";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/session";

import type { ResponseWithAuthor } from "@/actions/comments";

interface CommentListProps {
  postId: string;
  postAuthorId: string;
  articlePath: string;
}

export async function CommentList({
  postId,
  postAuthorId,
  articlePath,
}: CommentListProps): Promise<React.JSX.Element> {
  const [session, comments] = await Promise.all([
    getSession(),
    getComments(postId),
  ]);
  if (comments.length === 0)
    return <p className="comment-empty">The conversation starts here.</p>;
  const replies = new Map<string, ResponseWithAuthor[]>();
  for (const row of comments) {
    if (row.comment.parentId) {
      const thread = replies.get(row.comment.parentId) ?? [];
      thread.push(row);
      replies.set(row.comment.parentId, thread);
    }
  }
  function renderResponse(
    { comment, author }: ResponseWithAuthor,
    hasReplies = false,
  ): React.JSX.Element {
    const initials = author.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const canDelete =
      session?.user?.id === author.id || session?.user?.id === postAuthorId;
    return (
      <article
        key={comment.id}
        id={`response-${comment.id}`}
        className="comment-entry min-w-0"
      >
        <header>
          <div className="flex min-w-0 items-start gap-3">
            <Avatar>
              <AvatarImage
                src={author.image || undefined}
                alt={author.name || "User avatar"}
              />
              <AvatarFallback>{initials || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <div className="comment-byline break-words">
                <Link href={`/@${author.username}`} className="hover:underline">
                  {author.name}
                </Link>
                <span>@{author.username}</span>
              </div>
              <time dateTime={comment.createdAt.toISOString()}>
                {comment.createdAt.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
          </div>
          {canDelete && (
            <DeleteCommentButton
              commentId={comment.id}
              hasReplies={hasReplies}
            />
          )}
        </header>
        <CommentContent content={comment.content} />
        {comment.likedByAuthor && (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
            <Heart size={14} fill="currentColor" aria-hidden="true" />
            Liked by author
          </p>
        )}
        <div className="mt-4 space-y-2">
          <ReplyControl
            postId={postId}
            commentId={comment.id}
            isLoggedIn={!!session?.user?.id}
            articlePath={articlePath}
          />
          {session?.user?.id === postAuthorId && (
            <AuthorLikeControl
              commentId={comment.id}
              likedByAuthor={comment.likedByAuthor}
            />
          )}
        </div>
      </article>
    );
  }
  return (
    <div>
      {comments
        .filter(({ comment }) => comment.parentId === null)
        .map((row) => {
          const children = replies.get(row.comment.id) ?? [];
          return (
            <div key={row.comment.id}>
              {renderResponse(row, children.length > 0)}
              {children.length > 0 && (
                <div
                  role="group"
                  aria-label={`Replies to ${row.author.name}`}
                  className="ml-4 border-l border-border pl-4 sm:ml-8 sm:pl-6"
                >
                  {children.map((child) => renderResponse(child))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
