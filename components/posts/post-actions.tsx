"use client";

import { useOptimistic, useTransition } from "react";

import { toggleLike } from "@/actions/likes";
import { Button } from "@/components/ui/button";

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: LikeButtonProps): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { liked: initialLiked, count: initialCount },
    (state, newLiked: boolean) => ({
      liked: newLiked,
      count: state.count + (newLiked ? 1 : -1),
    }),
  );

  function handleClick() {
    startTransition(async () => {
      setOptimistic(!optimistic.liked);
      await toggleLike(postId);
    });
  }

  const likeText =
    optimistic.count === 0
      ? "Like this story"
      : optimistic.count === 1
        ? "1 reader liked this story"
        : `${optimistic.count} readers liked this story`;

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={optimistic.liked}
      variant={optimistic.liked ? "default" : "outline"}
    >
      <span aria-hidden="true">{optimistic.liked ? "♥" : "♡"}</span>
      <span>{likeText}</span>
    </Button>
  );
}
