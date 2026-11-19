"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";

import { toggleAuthorLike } from "@/actions/comments";
import { CommentForm } from "@/components/comments/comment-form";
import { Button } from "@/components/ui/button";

interface ReplyControlProps {
  postId: string;
  commentId: string;
  isLoggedIn: boolean;
  articlePath: string;
}

export function ReplyControl({
  postId,
  commentId,
  isLoggedIn,
  articlePath,
}: ReplyControlProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!isLoggedIn)
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/sign-in?callbackUrl=${encodeURIComponent(articlePath)}`}>
          Reply
        </Link>
      </Button>
    );
  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {open ? "Cancel reply" : "Reply"}
      </Button>
      {open && (
        <div id={id}>
          <CommentForm
            postId={postId}
            parentId={commentId}
            isLoggedIn={isLoggedIn}
            articlePath={articlePath}
            onSuccess={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export function AuthorLikeControl({
  commentId,
  likedByAuthor,
}: {
  commentId: string;
  likedByAuthor: boolean;
}): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={likedByAuthor}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              const result = await toggleAuthorLike(commentId);
              if (result.error)
                setError(
                  result.error === "Unauthorized"
                    ? "Only the post author can like a response. Please sign in again."
                    : result.error,
                );
            } catch {
              setError("Could not update this response. Please try again.");
            }
          })
        }
      >
        {likedByAuthor ? "Remove author like" : "Like as author"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
