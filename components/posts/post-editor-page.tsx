"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { TagInput } from "@/components/posts/tag-input";
import { LexicalEditor } from "@/components/posts/lexical-editor";
import { useDraftSave } from "@/components/posts/use-draft-save";
import { ImageUpload } from "@/components/layout/image-upload";
import { publishPost, unpublishPost, deletePost } from "@/actions/posts";
import { useSession } from "@/lib/auth-client";

import type { Post, Tag } from "@/lib/db/schema";

interface PostEditorPageProps {
  mode: "new" | "edit";
  post?: Post & { tags?: Tag[] };
}

export function PostEditorPage({
  post,
}: PostEditorPageProps): React.JSX.Element {
  const router = useRouter();
  const { data: session } = useSession();
  const [title, setTitle] = useState(post?.title || "");
  const [tags, setTags] = useState<string[]>(
    post?.tags?.map((tag) => tag.name) || [],
  );
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [coverImage, setCoverImage] = useState(post?.coverImage || "");
  const [published, setPublished] = useState(post?.published || false);
  const [panel, setPanel] = useState(false);
  const [pending, setPending] = useState(false);
  const draft = useDraftSave(
    { title, tags, excerpt, content, coverImage },
    post?.slug || "",
    published || pending,
  );

  async function publish(): Promise<void> {
    setPending(true);
    try {
      const slug = await draft.save();
      if (!slug) return;
      if (published) {
        setPanel(false);
        toast.success("Story saved");
        router.refresh();
        return;
      }
      const result = await publishPost(slug);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPublished(true);
      setPanel(false);
      toast.success("Story published");
      router.refresh();
    } catch {
      toast.error("Could not publish. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function unpublish(): Promise<void> {
    if (!draft.currentSlug) return;
    setPending(true);
    try {
      const result = await unpublishPost(draft.currentSlug);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPublished(false);
      toast.success("Returned to drafts");
      router.refresh();
    } catch {
      toast.error("Could not unpublish. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove(): Promise<void> {
    if (!draft.currentSlug) return;
    setPending(true);
    try {
      const result = await deletePost(draft.currentSlug);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.push("/manuscripts");
    } catch {
      toast.error("Could not delete. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-background"
    >
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-background px-5 py-3 md:px-10">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            href="/manuscripts"
            aria-label="Back to manuscripts"
            onClick={(event) => {
              if (draft.dirty && !window.confirm("Leave with unsaved changes?"))
                event.preventDefault();
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← <span className="hidden sm:inline">Manuscripts</span>
          </Link>
          <span
            role="status"
            aria-live="polite"
            className="text-xs text-muted-foreground"
          >
            {draft.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(draft.dirty || draft.error) && (
            <button
              type="button"
              onClick={() => void draft.save()}
              disabled={draft.saving || pending}
              className="text-xs text-muted-foreground underline"
            >
              {draft.error ? "Retry save" : "Save"}
            </button>
          )}
          <Button
            onClick={() => setPanel(true)}
            disabled={(!title.trim() && !draft.currentSlug) || pending}
          >
            {published ? "Publishing settings" : "Publish"}
          </Button>
        </div>
      </header>
      {draft.error && (
        <p
          role="alert"
          className="mx-auto max-w-[680px] px-5 pt-5 text-sm text-destructive"
        >
          {draft.error}
        </p>
      )}
      <div
        className="mx-auto max-w-[744px] px-8 pb-32 pt-16 md:pt-24"
        onBlur={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget) &&
            !published &&
            draft.dirty &&
            title.trim()
          )
            void draft.save();
        }}
      >
        <TextareaAutosize
          name="title"
          aria-label="Post title"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          minRows={1}
          className="mb-5 w-full resize-none bg-transparent font-serif text-[36px] leading-[1.05] tracking-tight placeholder:text-muted-foreground/60 focus:outline-none md:text-[56px]"
        />
        <TextareaAutosize
          name="excerpt"
          aria-label="Post subtitle"
          placeholder="Add a subtitle (optional)"
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          maxLength={300}
          minRows={1}
          className="mb-12 w-full resize-none bg-transparent text-lg leading-relaxed text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <LexicalEditor
          initialContent={post?.content || ""}
          onChange={setContent}
          placeholder="Begin your story…"
        />
      </div>
      <Dialog open={panel} onOpenChange={setPanel}>
        <DialogContent>
          <div className="max-h-[80vh] space-y-6 overflow-y-auto pr-1">
            <DialogHeader>
              <DialogTitle>Ready for readers?</DialogTitle>
              <DialogDescription>
                Review your story before publishing.
              </DialogDescription>
            </DialogHeader>
            <article className="border-b border-border pb-5">
              {coverImage && (
                <div
                  className="mb-4 aspect-[2/1] overflow-hidden bg-muted"
                  style={{
                    backgroundImage: `url(${JSON.stringify(coverImage)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  role="img"
                  aria-label="Cover preview"
                />
              )}
              <h2 className="break-words font-serif text-4xl leading-tight">
                {title || "Untitled story"}
              </h2>
              {excerpt && (
                <p className="mt-3 break-words text-sm text-muted-foreground">
                  {excerpt}
                </p>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                By {session?.user.name || "you"}
              </p>
            </article>
            <label className="block text-sm">
              Subtitle / SEO description
              <textarea
                aria-label="Subtitle / SEO description"
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
                maxLength={300}
                rows={3}
                disabled={pending}
                className="mt-2 w-full resize-y border border-border bg-transparent p-3 text-sm outline-primary"
              />
              <span className="mt-2 block text-xs text-muted-foreground">
                Used as your subtitle, preview and search description.
              </span>
            </label>
            <TagInput value={tags} onChange={setTags} />
            <div className="space-y-2">
              <p className="text-sm">Cover image (optional)</p>
              <ImageUpload
                value={coverImage}
                onChange={setCoverImage}
                disabled={pending}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
              <div className="flex items-center gap-4">
                {published && (
                  <button
                    type="button"
                    onClick={() => void unpublish()}
                    disabled={pending || draft.saving}
                    className="text-xs text-muted-foreground underline"
                  >
                    Unpublish
                  </button>
                )}
                {draft.currentSlug && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        disabled={pending || draft.saving}
                        className="text-xs text-muted-foreground underline"
                      >
                        Delete draft
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this story?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep writing</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void remove()}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Button
                onClick={() => void publish()}
                disabled={pending || draft.saving || !title.trim()}
              >
                {pending
                  ? "Publishing…"
                  : published
                    ? "Save changes"
                    : "Confirm publish"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
