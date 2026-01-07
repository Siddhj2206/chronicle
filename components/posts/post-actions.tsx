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
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {optimistic.liked ? "Liked" : "Like"} ({optimistic.count})
    </Button>
  );
}
