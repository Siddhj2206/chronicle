"use client";

import { useState, useTransition, useCallback, useId } from "react";
import Link from "next/link";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addComment } from "@/actions/comments";

import type { ReactElement } from "react";

interface CommentFormProps {
  postId: string;
  isLoggedIn: boolean;
  articlePath: string;
}

export function CommentForm({
  postId,
  isLoggedIn,
  articlePath,
}: CommentFormProps): ReactElement {
  const commentId = useId();
  const errorId = `${commentId}-error`;
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!content.trim()) {
        setError("Your note cannot be empty");
        return;
      }

      const formData = new FormData();
      formData.set("content", content);

      startTransition(async () => {
        const result = await addComment(postId, formData);

        if (result.error) {
          setError(
            result.error === "Unauthorized"
              ? "Your session has expired. Please sign in again to submit your note."
              : result.error,
          );
        } else {
          setContent("");
          setError(null);
        }
      });
    },
    [content, postId],
  );

  if (!isLoggedIn) {
    return (
      <div className="comment-guest">
        <p>Sign in to join the conversation.</p>
        <div>
          <Button asChild>
            <Link
              href={`/sign-in?callbackUrl=${encodeURIComponent(articlePath)}`}
            >
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <Label htmlFor={commentId}>Leave a note</Label>
        <Textarea
          id={commentId}
          name="comment"
          placeholder="Share your thoughts on this article…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Submitting..." : "Send your note"}
      </Button>
    </form>
  );
}
