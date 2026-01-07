"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-full bg-muted" />,
});

interface PostEditorProps {
  initialContent?: string;
  onChange: (content: string) => void;
}

export function PostEditor({ initialContent = "", onChange }: PostEditorProps) {
  const [value, setValue] = useState(initialContent);

  function handleChange(newValue?: string) {
    const content = newValue || "";
    setValue(content);
    onChange(content);
  }

  return (
    <div className="prose prose-lg prose-neutral dark:prose-invert max-w-none">
      <div 
        data-color-mode="light"
        className="post-editor-wrapper"
      >
        <MDEditor 
          value={value} 
          onChange={handleChange} 
          preview="edit"
          height={600}
          visibleDragbar={false}
          className={cn(
            "!border-0 !shadow-none",
            "bg-transparent dark:bg-transparent",
            "[&_.w-md-editor-toolbar]:!bg-transparent [&_.w-md-editor-toolbar]:!border-0 [&_.w-md-editor-toolbar]:!text-muted-foreground",
            "[&_.w-md-editor-toolbar_li_button]:!text-muted-foreground hover:[&_.w-md-editor-toolbar_li_button]:!text-foreground",
            "[&_.w-md-editor-text-pre_>_code]:!font-mono [&_.w-md-editor-text-pre_>_code]:!text-base",
            "[&_.w-md-editor-text-input]:!font-serif [&_.w-md-editor-text-input]:!text-lg [&_.w-md-editor-text-input]:!leading-relaxed",
            "[&_.w-md-editor-preview]:!font-serif [&_.w-md-editor-preview]:!text-lg [&_.w-md-editor-preview]:!leading-relaxed",
            // Hide preview button and other chrome we don't want
            "[&_.w-md-editor-toolbar-divider]:!hidden",
            // Custom selection color if needed
            "selection:bg-neutral-200 dark:selection:bg-neutral-800"
          )}
        />
      </div>
    </div>
  );
}
