"use client";

import Link from "next/link";

import { PROFILE_TABS } from "@/lib/profile";
import { cn } from "@/lib/utils";

import type { ProfileTab } from "@/lib/profile";

export function ProfileTabs({
  activeTab,
  username,
}: {
  activeTab: ProfileTab;
  username: string;
}): React.JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Profile sections"
      className="flex gap-8 border-b border-border"
    >
      {PROFILE_TABS.map((tab, index) => (
        <Link
          key={tab.id}
          id={`profile-tab-${tab.id}`}
          href={`/@${encodeURIComponent(username)}?tab=${tab.id}`}
          scroll={false}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`profile-panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={cn(
            "border-b-2 border-transparent px-1 py-4 text-sm text-muted-foreground hover:text-foreground",
            activeTab === tab.id && "border-foreground text-foreground",
          )}
          onKeyDown={(event) => {
            if (event.key === " ") {
              event.preventDefault();
              event.currentTarget.click();
            }
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? PROFILE_TABS.length - 1
                  : event.key === "ArrowRight"
                    ? (index + 1) % PROFILE_TABS.length
                    : event.key === "ArrowLeft"
                      ? (index - 1 + PROFILE_TABS.length) % PROFILE_TABS.length
                      : null;
            if (next !== null) {
              event.preventDefault();
              document
                .getElementById(`profile-tab-${PROFILE_TABS[next].id}`)
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
