"use client";

import { useEffect, useState, useLayoutEffect } from "react";
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

// Use layoutEffect to avoid flash, but handle SSR
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function PostContent({ content }: PostContentProps) {
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");

  useIsomorphicLayoutEffect(() => {
    // Initial check
    const isDark = document.documentElement.classList.contains("dark");
    setColorMode(isDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setColorMode(isDark ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div data-color-mode={colorMode} className="wmde-markdown-var">
      <MDPreview source={content} />
    </div>
  );
}
