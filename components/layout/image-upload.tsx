"use client";

import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  className?: string;
  disabled?: boolean;
  aspectRatio?: "video" | "square";
}

export function ImageUpload({ 
  value, 
  onChange, 
  className, 
  disabled,
  aspectRatio = "video" 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  // Sync preview with value prop changes
  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const aspectClass = aspectRatio === "square" ? "aspect-square" : "aspect-video";

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        const { url } = await response.json();

        setPreview(url);
        onChange(url);
        toast.success("Image uploaded");
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: disabled || isUploading,
  });

  if (preview) {
    return (
      <div 
        {...getRootProps()}
        className={cn(
          "group relative w-full cursor-pointer overflow-hidden border-2 border-dashed border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900", 
          aspectClass,
          className
        )}
      >
        <input {...getInputProps()} />
        <Image
          src={preview}
          alt="Upload preview"
          fill
          unoptimized
          className="object-cover transition-opacity group-hover:opacity-75"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
           <Button
            type="button"
            variant="secondary"
            size="sm"
            className="font-mono text-xs font-bold uppercase tracking-widest"
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
              onChange("");
            }}
          >
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative flex w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed border-neutral-300 bg-neutral-50 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800",
        aspectClass,
        isDragActive && "border-black bg-neutral-100 dark:border-white dark:bg-neutral-800",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-foreground">
        {isUploading ? (
          <div className="font-mono text-xs uppercase tracking-widest">Uploading...</div>
        ) : (
          <>
             <div className="font-serif text-sm italic">
              {isDragActive ? "Drop to upload" : aspectRatio === "square" ? "Add Photo" : "Add Cover Image"}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest opacity-50">
              Drag & Drop or Click
            </div>
          </>
        )}
      </div>
    </div>
  );
}
