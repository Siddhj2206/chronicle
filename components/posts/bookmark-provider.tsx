"use client";

import { createContext, useContext, useOptimistic } from "react";

import type { BookmarkViewer } from "@/lib/bookmarks";

interface BookmarkUpdate {
  postId: string;
  saved: boolean;
}
interface BookmarkContextValue extends BookmarkViewer {
  update: (value: BookmarkUpdate) => void;
}

const BookmarkContext = createContext<BookmarkContextValue>({
  userId: null,
  savedIds: [],
  update: () => {},
});

export function BookmarkProvider({
  viewer,
  children,
}: {
  viewer: BookmarkViewer;
  children?: React.ReactNode;
}): React.JSX.Element {
  const [savedIds, update] = useOptimistic(
    viewer.savedIds,
    (ids, value: BookmarkUpdate) => {
      if (!ids) return null;
      const remaining = ids.filter((id) => id !== value.postId);
      return value.saved ? [...remaining, value.postId] : remaining;
    },
  );
  return (
    <BookmarkContext value={{ userId: viewer.userId, savedIds, update }}>
      {children}
    </BookmarkContext>
  );
}

export function useBookmarks(): BookmarkContextValue {
  return useContext(BookmarkContext);
}
