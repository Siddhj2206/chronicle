"use client";

import { useEffect, useRef, useState } from "react";

import { MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

import { LikeButton } from "@/components/posts/post-actions";
import { Button } from "@/components/ui/button";
import { shareArticle } from "@/lib/share-article";

interface ArticleActionsProps {
  postId: string;
  title: string;
  initialLiked: boolean;
  initialCount: number;
  commentCount: number;
  commentsId: string;
}

export function ArticleActions({
  postId,
  title,
  initialLiked,
  initialCount,
  commentCount,
  commentsId,
}: ArticleActionsProps): React.JSX.Element {
  const [sharing, setSharing] = useState(false);
  const [copyLink, setCopyLink] = useState("");
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const actions = actionsRef.current;
    const article = actions?.closest("article.reader");
    if (!actions || !(article instanceof HTMLElement)) return;
    const observer = new ResizeObserver(() => {
      article.style.setProperty(
        "--article-actions-height",
        `${actions.getBoundingClientRect().height + 24}px`,
      );
    });
    observer.observe(actions);
    return () => {
      observer.disconnect();
      article.style.removeProperty("--article-actions-height");
    };
  }, []);

  function respond() {
    const comments = document.getElementById(commentsId);
    if (!comments) return;
    const target = comments.querySelector("textarea") ?? comments;
    target.focus({ preventScroll: true });
    comments.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  async function share() {
    setSharing(true);
    const url = new URL(window.location.pathname, window.location.origin).href;
    try {
      const result = await shareArticle(title, url);
      setCopyLink("");
      if (result === "copied") toast.success("Link copied to clipboard");
    } catch {
      setCopyLink(url);
      toast.error("Unable to share automatically. Copy the story link below.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      ref={actionsRef}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:mt-12 md:max-w-[680px] md:border-y md:px-0 md:py-5"
      role="group"
      aria-label="Story actions"
    >
      <div className="flex items-center justify-between gap-2 md:justify-start md:gap-5">
        <LikeButton
          postId={postId}
          initialLiked={initialLiked}
          initialCount={initialCount}
          compact
        />
        <Button
          variant="ghost"
          onClick={respond}
          aria-label={`Respond (${commentCount})`}
        >
          <MessageCircle aria-hidden="true" />
          <span>Respond {commentCount}</span>
        </Button>
        <Button variant="ghost" onClick={share} disabled={sharing}>
          <Share2 aria-hidden="true" />
          <span>Share</span>
        </Button>
      </div>
      {copyLink && (
        <label className="mt-3 block text-xs text-muted-foreground">
          Story link
          <input
            aria-label="Story link"
            className="mt-1 w-full border border-border bg-background p-2 text-foreground"
            readOnly
            value={copyLink}
            onFocus={(event) => event.target.select()}
          />
        </label>
      )}
    </div>
  );
}
