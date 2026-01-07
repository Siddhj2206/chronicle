"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addComment } from "@/actions/comments";

interface CommentFormProps {
  postId: string;
}

export function CommentForm({ postId }: CommentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!content.trim()) {
      setError("Comment cannot be empty");
      return;
    }

    const formData = new FormData();
    formData.set("content", content);

    startTransition(async () => {
      const result = await addComment(postId, formData);

      if (result.error) {
        setError(result.error);
      } else {
        setContent("");
        setError(null);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="comment">Add a comment</Label>
        <Textarea
          id="comment"
          placeholder="Write your comment (markdown supported)..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
        />
      </div>
      {error && <p>{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Posting..." : "Post Comment"}
      </Button>
    </form>
  );
}
