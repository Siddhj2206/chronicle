"use client";

import { useCallback, useState } from "react";
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
}

export function ImageUpload({ value, onChange, className, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);

      try {
        // 1. Get Presigned URL
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        });

        if (!response.ok) throw new Error("Failed to get upload URL");

        const { presignedUrl, key } = await response.json();

        // 2. Upload to R2
        const uploadResponse = await fetch(presignedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadResponse.ok) throw new Error("Upload failed");

        // 3. Construct Public URL
        const domain = process.env.NEXT_PUBLIC_R2_DOMAIN; 
        // Fallback: if no domain, use the presigned URL without query params (not ideal for private buckets but works if public)
        // Ideally NEXT_PUBLIC_R2_DOMAIN is set.
        const url = domain 
          ? `https://${domain}/${key}` 
          : presignedUrl.split("?")[0]; 

        setPreview(url);
        onChange(url);
        toast.success("Image uploaded");
      } catch (error) {
        console.error(error);
        toast.error("Failed to upload image");
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
      <div className={cn("group relative aspect-video w-full overflow-hidden rounded-md bg-muted", className)}>
        <Image
          src={preview}
          alt="Cover"
          fill
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
        "group relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed border-neutral-300 bg-neutral-50 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800",
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
              {isDragActive ? "Drop to upload" : "Add Cover Image"}
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
