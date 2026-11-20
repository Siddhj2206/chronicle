import type { User } from "@/lib/db/schema";

export const HOME_TABS = [{ id: "latest", label: "Latest" }] as const;

export type HomeTab = (typeof HOME_TABS)[number]["id"];
type FeedWriter = Pick<User, "id" | "name" | "username" | "image">;

export function homeTab(value: unknown): HomeTab {
  return HOME_TABS.find((tab) => tab.id === value)?.id ?? HOME_TABS[0].id;
}

export function homeWriters(authors: FeedWriter[]): FeedWriter[] {
  const seen = new Set<string>();
  return authors
    .filter((author) => {
      if (!author.username || seen.has(author.id)) return false;
      seen.add(author.id);
      return true;
    })
    .slice(0, 4);
}
