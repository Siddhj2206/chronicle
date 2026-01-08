"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addComment } from "@/actions/comments";

interface CommentFormProps {
  postId: string;
  isLoggedIn?: boolean;
}

export function CommentForm({ postId, isLoggedIn = true }: CommentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <div className="border-2 border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
        <p className="font-serif italic text-muted-foreground">
          <Link href="/sign-in" className="underline hover:text-foreground">
            Sign in
          </Link>{" "}
          to write to the editor.
        </p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!content.trim()) {
      setError("Your letter cannot be empty");
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <Label
          htmlFor="comment"
          className="block font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground"
        >
          ━━━ Write to the Editor ━━━
        </Label>
        <Textarea
          id="comment"
          placeholder="Share your thoughts on this article..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="rounded-none border-2 border-black font-serif dark:border-white"
        />
      </div>
      {error && (
        <p className="font-mono text-sm font-medium text-destructive">{error}</p>
      )}
      <Button
        type="submit"
        disabled={isPending}
        className="rounded-none border-2 border-black bg-black px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        {isPending ? "Submitting..." : "Submit Letter"}
      </Button>
    </form>
  );
}
