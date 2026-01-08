"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-full bg-muted" />,
});

interface PostEditorProps {
  initialContent?: string;
  onChange: (content: string) => void;
  onImageInsertRequest?: () => void;
}

export function PostEditor({ 
  initialContent = "", 
  onChange,
  onImageInsertRequest,
}: PostEditorProps) {
  const [value, setValue] = useState(initialContent);
  const [colorMode, setColorMode] = useState<"light" | "dark" | null>(null);

  // Sync with initialContent changes (for edit mode)
  useEffect(() => {
    setValue(initialContent);
  }, [initialContent]);

  // Detect and listen for theme changes
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setColorMode(isDark ? "dark" : "light");

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

  function handleChange(newValue?: string) {
    const content = newValue || "";
    setValue(content);
    onChange(content);
  }

  // Custom toolbar commands
  const customCommands = onImageInsertRequest ? [
    {
      name: "image-upload",
      keyCommand: "image-upload",
      buttonProps: { "aria-label": "Insert image", title: "Insert image" },
      icon: (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      ),
      execute: () => {
        onImageInsertRequest();
      },
    },
  ] : [];

  // Show skeleton until client-side hydration is complete
  if (colorMode === null) {
    return <Skeleton className="h-[400px] w-full bg-muted" />;
  }

  return (
    <div 
      data-color-mode={colorMode}
      className="wmde-markdown-var"
    >
      <MDEditor 
        value={value} 
        onChange={handleChange} 
        preview="edit"
        height="100%"
        visibleDragbar={false}
        extraCommands={customCommands}
        textareaProps={{
          placeholder: "Begin your story...",
        }}
      />
    </div>
  );
}

// Helper to insert text at cursor position (exported for use by parent)
export function insertTextAtCursor(
  textareaRef: HTMLTextAreaElement | null,
  text: string
) {
  if (!textareaRef) return;
  
  const start = textareaRef.selectionStart;
  const end = textareaRef.selectionEnd;
  const value = textareaRef.value;
  
  textareaRef.value = value.substring(0, start) + text + value.substring(end);
  textareaRef.selectionStart = textareaRef.selectionEnd = start + text.length;
  textareaRef.focus();
  
  // Trigger change event
  const event = new Event("input", { bubbles: true });
  textareaRef.dispatchEvent(event);
}
