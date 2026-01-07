"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

const MDPreview = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full" />,
  }
);

interface PostContentProps {
  content: string;
}

export function PostContent({ content }: PostContentProps) {
  return (
    <div data-color-mode="light">
      <MDPreview source={content} />
    </div>
  );
}
