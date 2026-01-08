"use client";

import { useOptimistic, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toggleLike } from "@/actions/likes";

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

  return (
    <Button
      variant={optimistic.liked ? "default" : "outline"}
      onClick={handleClick}
      disabled={isPending}
      className="gap-2 font-semibold uppercase tracking-wide"
    >
      <span>{optimistic.liked ? "♥" : "♡"}</span>
      <span>
        {optimistic.count} {optimistic.count === 1 ? "Like" : "Likes"}
      </span>
    </Button>
  );
}
