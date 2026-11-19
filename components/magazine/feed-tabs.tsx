"use client";

import Link from "next/link";

import { HOME_TABS } from "@/lib/home-feed";
import { cn } from "@/lib/utils";

import type { HomeTab } from "@/lib/home-feed";

export function FeedTabs({
  activeTab,
}: {
  activeTab: HomeTab;
}): React.JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Story feeds"
      className="flex gap-7 border-b border-border"
    >
      {HOME_TABS.map((tab) => (
        <Link
          key={tab.id}
          id={`home-tab-${tab.id}`}
          href={`/?tab=${tab.id}`}
          scroll={false}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`home-panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={cn(
            "border-b-2 border-transparent px-1 py-4 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4",
            activeTab === tab.id && "border-foreground text-foreground",
          )}
          onKeyDown={(event) => {
            if (event.key === " ") {
              event.preventDefault();
              event.currentTarget.click();
            }
            const index = HOME_TABS.findIndex((entry) => entry.id === tab.id);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? HOME_TABS.length - 1
                  : event.key === "ArrowRight"
                    ? (index + 1) % HOME_TABS.length
                    : event.key === "ArrowLeft"
                      ? (index - 1 + HOME_TABS.length) % HOME_TABS.length
                      : null;
            if (next !== null) {
              event.preventDefault();
              document
                .getElementById(`home-tab-${HOME_TABS[next].id}`)
                ?.focus();
            }
          }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
