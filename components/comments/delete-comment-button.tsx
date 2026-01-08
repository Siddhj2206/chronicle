"use client";

import { useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteComment } from "@/actions/comments";

interface DeleteCommentButtonProps {
  commentId: string;
}

export function DeleteCommentButton({ commentId }: DeleteCommentButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteComment(commentId);
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          disabled={isPending}
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "..." : "Retract"}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-none border-2 border-black dark:border-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-xl font-bold">
            Retract This Letter?
          </AlertDialogTitle>
          <AlertDialogDescription className="font-serif">
            This action cannot be undone. Your correspondence will be
            permanently removed from the archives.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none border-2 border-black font-mono text-xs uppercase tracking-widest dark:border-white">
            Keep Letter
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="rounded-none border-2 border-destructive bg-destructive font-mono text-xs uppercase tracking-widest text-destructive-foreground hover:bg-destructive/90"
          >
            Retract
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
