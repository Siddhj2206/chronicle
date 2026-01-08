"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PostEditor } from "@/components/posts/post-editor";
import { PostContent } from "@/components/posts/post-content";
import { ImageUpload } from "@/components/layout/image-upload";
import { ImageInsertDialog } from "@/components/posts/image-insert-dialog";
import {
  createPost,
  updatePost,
  publishPost,
  unpublishPost,
  deletePost,
} from "@/actions/posts";
import { cn } from "@/lib/utils";

import type { Post } from "@/lib/db/schema";

interface PostEditorPageProps {
  mode: "new" | "edit";
  post?: Post;
}

const AUTO_SAVE_DELAY = 30000; // 30 seconds

export function PostEditorPage({ mode, post }: PostEditorPageProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Form state
  const [title, setTitle] = useState(post?.title || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [coverImage, setCoverImage] = useState(post?.coverImage || "");
  const [isPublished, setIsPublished] = useState(post?.published || false);
  const [currentSlug, setCurrentSlug] = useState(post?.slug || "");

  // Image insert dialog
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Mobile view toggle
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  const initialDataRef = useRef({ title, excerpt, content, coverImage });

  // Check for changes
  useEffect(() => {
    const hasChanged =
      title !== initialDataRef.current.title ||
      excerpt !== initialDataRef.current.excerpt ||
      content !== initialDataRef.current.content ||
      coverImage !== initialDataRef.current.coverImage;
    setHasChanges(hasChanged);
  }, [title, excerpt, content, coverImage]);

  // Auto-save functionality (only in edit mode)
  useEffect(() => {
    if (mode !== "edit" || !hasChanges || !currentSlug) return;

    const timer = setTimeout(async () => {
      await savePost(true);
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, excerpt, content, coverImage, mode, hasChanges, currentSlug]);

  const savePost = useCallback(
    async (isAutoSave = false) => {
      if (!title.trim()) {
        if (!isAutoSave) toast.error("Title is required");
        return;
      }

      if (isAutoSave) {
        setIsSaving(true);
      } else {
        setIsPending(true);
      }

      try {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        formData.append("excerpt", excerpt);
        formData.append("coverImage", coverImage);

        if (mode === "new") {
          const result = await createPost(formData);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          setCurrentSlug(result.slug!);
          // Update URL without full reload
          router.replace(`/edit/${result.slug}`);
          toast.success("Manuscript created");
          // Update initial data ref
          initialDataRef.current = { title, excerpt, content, coverImage };
          setHasChanges(false);
        } else {
          const result = await updatePost(currentSlug, formData);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          if (!isAutoSave) {
            toast.success("Manuscript saved");
          }
          setLastSaved(new Date());
          // Update initial data ref
          initialDataRef.current = { title, excerpt, content, coverImage };
          setHasChanges(false);
        }
      } catch {
        toast.error("Something went wrong");
      } finally {
        setIsPending(false);
        setIsSaving(false);
      }
    },
    [title, content, excerpt, coverImage, mode, currentSlug, router]
  );

  const handlePublish = useCallback(async () => {
    // Save first if there are changes
    if (hasChanges || mode === "new") {
      await savePost();
    }

    if (!currentSlug) return;

    setIsPending(true);
    try {
      if (isPublished) {
        await unpublishPost(currentSlug);
        setIsPublished(false);
        toast.success("Manuscript unpublished");
      } else {
        await publishPost(currentSlug);
        setIsPublished(true);
        toast.success("Manuscript published!");
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsPending(false);
    }
  }, [currentSlug, isPublished, hasChanges, mode, savePost, router]);

  const handleDelete = useCallback(async () => {
    if (
      !confirm(
        "Are you sure you want to burn this manuscript? This action cannot be undone."
      )
    ) {
      return;
    }

    if (!currentSlug) {
      router.push("/manuscripts");
      return;
    }

    setIsPending(true);
    try {
      const result = await deletePost(currentSlug);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Manuscript burned");
      router.push("/manuscripts");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsPending(false);
    }
  }, [currentSlug, router]);

  const handleImageInsert = useCallback(
    (markdown: string) => {
      setContent((prev) => prev + "\n\n" + markdown + "\n\n");
    },
    []
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/manuscripts"
              className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              ← Back
            </Link>
            <div className="hidden h-4 w-px bg-border md:block" />
            <span
              className={cn(
                "hidden rounded-none border px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest md:inline-block",
                isPublished
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-neutral-400 text-neutral-500"
              )}
            >
              {isPublished ? "Published" : "Draft"}
            </span>
            {isSaving && (
              <span className="font-mono text-xs text-muted-foreground">
                Saving...
              </span>
            )}
            {lastSaved && !isSaving && !hasChanges && (
              <span className="hidden font-mono text-xs text-muted-foreground md:inline">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {mode === "edit" && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={isPending}
                className="h-8 font-mono text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Burn
              </Button>
            )}
            <div className="hidden h-4 w-px bg-border md:block" />
            <Button
              type="button"
              variant="outline"
              onClick={() => savePost(false)}
              disabled={isPending || (!hasChanges && mode === "edit")}
              className="h-8 rounded-none font-mono text-xs font-bold uppercase tracking-widest"
            >
              {isPending ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              disabled={isPending || !title.trim()}
              className="h-8 rounded-none bg-black px-4 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex border-t border-border lg:hidden">
          <button
            type="button"
            onClick={() => setMobileView("editor")}
            className={cn(
              "flex-1 py-2 font-mono text-xs font-bold uppercase tracking-widest",
              mobileView === "editor"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-muted-foreground"
            )}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setMobileView("preview")}
            className={cn(
              "flex-1 py-2 font-mono text-xs font-bold uppercase tracking-widest",
              mobileView === "preview"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-muted-foreground"
            )}
          >
            Preview
          </button>
        </div>
      </header>

      {/* Main Content - Side by Side */}
      <div className="flex flex-1">
        {/* Editor Pane */}
        <div
          className={cn(
            "flex-1 border-r border-border p-6 md:p-8",
            mobileView === "preview" ? "hidden lg:block" : "block"
          )}
        >
          <div className="space-y-8">
            {/* Cover Image Upload */}
            <div className="space-y-2">
              <label className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Cover Image
              </label>
              <ImageUpload
                value={coverImage}
                onChange={setCoverImage}
                aspectRatio="video"
              />
            </div>

            {/* Title */}
            <TextareaAutosize
              placeholder="Title"
              className="w-full resize-none bg-transparent font-serif text-4xl font-black leading-tight tracking-tight placeholder:text-muted-foreground/30 focus:outline-none md:text-5xl"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              minRows={1}
            />

            {/* Excerpt */}
            <TextareaAutosize
              placeholder="Write a brief excerpt or subtitle..."
              className="w-full resize-none bg-transparent font-serif text-xl italic leading-relaxed text-muted-foreground placeholder:text-muted-foreground/30 focus:outline-none"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              minRows={1}
            />

            {/* Content Editor */}
            <div>
              <PostEditor
                initialContent={content}
                onChange={setContent}
                onImageInsertRequest={() => setImageDialogOpen(true)}
              />
            </div>
          </div>
        </div>

        {/* Preview Pane */}
        <div
          className={cn(
            "flex-1 bg-muted/30 p-6 md:p-8",
            mobileView === "editor" ? "hidden lg:block" : "block"
          )}
        >
          <div>
            {/* Preview Header */}
            <div className="mb-8 border-b-2 border-black pb-4 dark:border-white">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Preview
              </span>
            </div>

            {/* Cover Image Preview */}
            {coverImage && (
              <figure className="mb-8">
                <div className="relative aspect-video w-full overflow-hidden border border-border">
                  <Image
                    src={coverImage}
                    alt={title || "Cover image"}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              </figure>
            )}

            {/* Title Preview */}
            {title ? (
              <h1 className="mb-4 font-serif text-4xl font-black leading-tight tracking-tight">
                {title}
              </h1>
            ) : (
              <h1 className="mb-4 font-serif text-4xl font-black leading-tight tracking-tight text-muted-foreground/30">
                Untitled
              </h1>
            )}

            {/* Excerpt Preview */}
            {excerpt && (
              <p className="mb-8 font-serif text-xl italic leading-relaxed text-muted-foreground">
                {excerpt}
              </p>
            )}

            {/* Content Preview */}
            {content ? (
              <div className="prose prose-lg prose-neutral dark:prose-invert font-serif prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-loose">
                <PostContent content={content} />
              </div>
            ) : (
              <p className="font-serif text-lg italic text-muted-foreground/50">
                Start writing to see the preview...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Image Insert Dialog */}
      <ImageInsertDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onInsert={handleImageInsert}
      />
    </div>
  );
}
