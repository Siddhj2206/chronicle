"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { toast } from "sonner";

import { toggleFollow } from "@/actions/follows";
import { Button } from "@/components/ui/button";

import type { ReactElement } from "react";

interface FollowButtonProps {
  authorId: string;
  viewerId: string | null;
  initialFollowing: boolean;
}

export function FollowButton({
  authorId,
  viewerId,
  initialFollowing,
}: FollowButtonProps): ReactElement | null {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [following, setFollowing] = useOptimistic(initialFollowing);

  if (viewerId === authorId) return null;
  if (!viewerId) {
    return (
      <Button variant="outline" asChild>
        <Link href={`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`}>
          Sign in to follow
        </Link>
      </Button>
    );
  }

  function handleFollow() {
    startTransition(async () => {
      setFollowing(!following);
      try {
        const result = await toggleFollow(authorId);
        if ("error" in result) toast.error(result.error);
        router.refresh();
      } catch {
        toast.error("Failed to update follow. Please try again.");
      }
    });
  }

  return (
    <Button
      variant="outline"
      onClick={handleFollow}
      disabled={pending}
      aria-pressed={following}
    >
      {following ? "Unfollow" : "Follow"}
    </Button>
  );
}
