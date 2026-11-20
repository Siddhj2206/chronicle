"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Bookmark } from "lucide-react";
import { toast } from "sonner";

import { toggleBookmark } from "@/actions/bookmarks";
import { useBookmarks } from "@/components/posts/bookmark-provider";
import { Button } from "@/components/ui/button";

export function BookmarkButton({
  postId,
  compact = false,
}: {
  postId: string;
  compact?: boolean;
}): React.JSX.Element {
  const { userId } = useBookmarks();
  const pathname = usePathname() || "/";
  if (!userId)
    return (
      <Button variant="ghost" size={compact ? "icon-sm" : "sm"} asChild>
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`}
          aria-label="Sign in to save story"
          title="Sign in to save story"
        >
          <Bookmark aria-hidden="true" />
          {!compact && "Save"}
        </Link>
      </Button>
    );
  return <SignedInBookmarkButton postId={postId} compact={compact} />;
}

function SignedInBookmarkButton({
  postId,
  compact,
}: {
  postId: string;
  compact: boolean;
}): React.JSX.Element {
  const { savedIds, update } = useBookmarks();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const saved = savedIds?.includes(postId) ?? false;
  const label = saved ? "Remove story from reading list" : "Save story";
  const icon = (
    <Bookmark aria-hidden="true" fill={saved ? "currentColor" : "none"} />
  );

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "icon-sm" : "sm"}
      disabled={pending || savedIds === null}
      aria-pressed={saved}
      aria-label={savedIds === null ? "Reading list unavailable" : label}
      title={savedIds === null ? "Refresh the page to try again." : label}
      onClick={() =>
        startTransition(async () => {
          update({ postId, saved: !saved });
          try {
            const result = await toggleBookmark(postId);
            if ("error" in result)
              toast.error(
                result.error === "Unauthorized"
                  ? "Your session has expired. Sign in to save this story."
                  : result.error,
              );
          } catch {
            toast.error("Could not update your reading list");
          } finally {
            router.refresh();
          }
        })
      }
    >
      {icon}
      {!compact && (saved ? "Saved" : "Save")}
    </Button>
  );
}
