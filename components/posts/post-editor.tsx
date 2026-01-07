"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-full" />,
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
    <div data-color-mode="light">
      <MDEditor value={value} onChange={handleChange} height={500} />
    </div>
  );
}
