import type { Post } from "@/lib/db/schema";

export const PROFILE_TABS = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number]["id"];

export function profileTab(value: unknown): ProfileTab {
  return PROFILE_TABS.find((tab) => tab.id === value)?.id ?? "home";
}

export function profileStories<
  T extends {
    post: Pick<Post, "id" | "published" | "publishedAt" | "viewCount">;
  },
>(stories: T[]): { featured: T | undefined; remaining: T[]; count: number } {
  const published = stories
    .filter(({ post }) => post.published)
    .sort(
      (a, b) =>
        (b.post.publishedAt?.getTime() ?? 0) -
          (a.post.publishedAt?.getTime() ?? 0) ||
        a.post.id.localeCompare(b.post.id),
    );
  const featured = published.reduce<T | undefined>(
    (best, story) =>
      !best || story.post.viewCount > best.post.viewCount ? story : best,
    undefined,
  );
  return {
    featured,
    remaining: published.filter((story) => story !== featured),
    count: published.length,
  };
}
