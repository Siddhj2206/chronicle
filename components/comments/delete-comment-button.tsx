"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteComment } from "@/actions/comments";

interface DeleteCommentButtonProps {
  commentId: string;
}

export function DeleteCommentButton({ commentId }: DeleteCommentButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    startTransition(async () => {
      await deleteComment(commentId);
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      Delete
    </Button>
  );
}
