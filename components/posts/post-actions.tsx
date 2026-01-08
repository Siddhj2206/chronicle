"use client";

import { useOptimistic, useTransition } from "react";

import { toggleLike } from "@/actions/likes";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: LikeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { liked: initialLiked, count: initialCount },
    (state, newLiked: boolean) => ({
      liked: newLiked,
      count: state.count + (newLiked ? 1 : -1),
    })
  );

  function handleClick() {
    startTransition(async () => {
      setOptimistic(!optimistic.liked);
      await toggleLike(postId);
    });
  }

  const likeText =
    optimistic.count === 0
      ? "Like This Story"
      : optimistic.count === 1
        ? "1 Reader Liked This Story"
        : `${optimistic.count} Readers Liked This Story`;

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex items-center gap-3 border-2 px-6 py-3 font-mono text-xs uppercase tracking-widest transition-colors",
        "border-black dark:border-white",
        "hover:bg-neutral-100 dark:hover:bg-neutral-900",
        "disabled:cursor-not-allowed disabled:opacity-50",
        optimistic.liked && "bg-black text-white dark:bg-white dark:text-black",
        optimistic.liked && "hover:bg-neutral-800 dark:hover:bg-neutral-200"
      )}
    >
      <span className="text-base">{optimistic.liked ? "♥" : "♡"}</span>
      <span>{likeText}</span>
    </button>
  );
}
