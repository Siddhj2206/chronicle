"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/layout/image-upload";

interface ImageInsertDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (markdown: string) => void;
}

export function ImageInsertDialog({
  open,
  onClose,
  onInsert,
}: ImageInsertDialogProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");

  function handleInsert() {
    if (!imageUrl) return;

    const markdown = `![${altText || "Image"}](${imageUrl})`;
    onInsert(markdown);

    // Reset state
    setImageUrl("");
    setAltText("");
    onClose();
  }

  function handleClose() {
    setImageUrl("");
    setAltText("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md rounded-none border-2 border-black dark:border-white">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm font-bold uppercase tracking-widest">
            Insert Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Upload Image
            </Label>
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              aspectRatio="video"
            />
          </div>

          {/* Alt Text */}
          <div className="space-y-2">
            <Label
              htmlFor="alt-text"
              className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground"
            >
              Alt Text (Optional)
            </Label>
            <Input
              id="alt-text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image..."
              className="rounded-none border-black font-serif dark:border-white"
            />
          </div>

          {/* Preview */}
          {imageUrl && (
            <div className="space-y-2">
              <Label className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Markdown Preview
              </Label>
              <code className="block rounded-none border border-border bg-muted p-3 font-mono text-xs break-all">
                ![{altText || "Image"}]({imageUrl})
              </code>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="rounded-none font-mono text-xs font-bold uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleInsert}
            disabled={!imageUrl}
            className="rounded-none bg-black font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            Insert
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
