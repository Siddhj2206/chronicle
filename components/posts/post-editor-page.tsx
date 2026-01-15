"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LexicalEditor } from "@/components/posts/lexical-editor";
import { ImageUpload } from "@/components/layout/image-upload";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  const initialDataRef = useRef({ title, excerpt, content, coverImage });
  
  // Use ref to store form data for savePost to avoid recreation on every state change
  const formDataRef = useRef({ title, excerpt, content, coverImage });
  useEffect(() => {
    formDataRef.current = { title, excerpt, content, coverImage };
  }, [title, excerpt, content, coverImage]);

  // Track last change time for optimized auto-save
  const lastChangeTimeRef = useRef<number>(Date.now());

  // Check for changes
  useEffect(() => {
    const hasChanged =
      title !== initialDataRef.current.title ||
      excerpt !== initialDataRef.current.excerpt ||
      content !== initialDataRef.current.content ||
      coverImage !== initialDataRef.current.coverImage;
    setHasChanges(hasChanged);
    if (hasChanged) {
      lastChangeTimeRef.current = Date.now();
    }
  }, [title, excerpt, content, coverImage]);

  // Warn before navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // Optimized savePost using refs to minimize dependency array
  const savePost = useCallback(
    async (isAutoSave = false) => {
      const { title, content, excerpt, coverImage } = formDataRef.current;
      
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
    [mode, currentSlug, router]
  );

  // Optimized auto-save: check periodically instead of resetting timer on every keystroke
  useEffect(() => {
    if (mode !== "edit" || !currentSlug) return;

    const checkAndSave = async () => {
      const timeSinceLastChange = Date.now() - lastChangeTimeRef.current;
      // Only auto-save if there are changes and enough time has passed since last change
      if (hasChanges && timeSinceLastChange >= AUTO_SAVE_DELAY) {
        await savePost(true);
      }
    };

    // Check every 5 seconds if we should auto-save
    const interval = setInterval(checkAndSave, 5000);
    return () => clearInterval(interval);
  }, [mode, hasChanges, currentSlug, savePost]);

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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/manuscripts"
              className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              ← Back
            </Link>
            <Separator orientation="vertical" className="hidden h-4 md:block" />
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isPending}
                    className="h-8 font-mono text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    Burn
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-none border-2 border-black dark:border-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-serif text-xl font-bold">
                      Burn This Manuscript?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="font-serif">
                      Are you sure you want to burn this manuscript? This action
                      cannot be undone. Your work will be permanently destroyed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-none border-2 border-black font-mono text-xs uppercase tracking-widest dark:border-white">
                      Keep Manuscript
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="rounded-none border-2 border-destructive bg-destructive font-mono text-xs uppercase tracking-widest text-destructive-foreground hover:bg-destructive/90"
                    >
                      Burn
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Separator orientation="vertical" className="hidden h-4 md:block" />
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
      </header>

      {/* Main Content - Full Width WYSIWYG */}
      <div className="flex-1 p-6 md:p-8 lg:px-16 xl:px-24">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Cover Image Upload */}
          <div className="space-y-2">
            <Label className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Cover Image
            </Label>
            <ImageUpload
              value={coverImage}
              onChange={setCoverImage}
              aspectRatio="video"
            />
          </div>

          {/* Title */}
          <TextareaAutosize
            name="title"
            aria-label="Post title"
            placeholder="Title…"
            className="w-full resize-none bg-transparent font-serif text-4xl font-black leading-tight tracking-tight placeholder:text-muted-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-5xl"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minRows={1}
          />

          {/* Excerpt */}
          <TextareaAutosize
            name="excerpt"
            aria-label="Post excerpt"
            placeholder="Write a brief excerpt or subtitle…"
            className="w-full resize-none bg-transparent font-serif text-xl italic leading-relaxed text-muted-foreground placeholder:text-muted-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            minRows={1}
          />

          {/* Content Editor - Lexical WYSIWYG */}
          <LexicalEditor
            initialContent={content}
            onChange={setContent}
            placeholder="Begin your story…"
          />
        </div>
      </div>
    </div>
  );
}
