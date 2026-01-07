"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PostEditor } from "@/components/posts/post-editor";
import { updatePost, publishPost, unpublishPost, deletePost } from "@/actions/posts";
import { cn } from "@/lib/utils";

import type { Post } from "@/lib/db/schema";

interface EditPostFormProps {
  post: Post;
}

export function EditPostForm({ post }: EditPostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      
      const result = await updatePost(post.slug, formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Manuscript updated");
    });
  }

  async function handlePublish() {
    startTransition(async () => {
      if (post.published) {
        await unpublishPost(post.slug);
        toast.success("Manuscript unpublished");
      } else {
        await publishPost(post.slug);
        toast.success("Manuscript published");
      }
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to burn this manuscript? This action cannot be undone.")) {
      return;
    }

    startTransition(async () => {
      const result = await deletePost(post.slug);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Manuscript burned");
      router.push("/dashboard");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl pb-20">
      {/* Header Actions */}
      <div className="mb-12 flex items-center justify-between border-b-4 border-black pb-4 dark:border-white">
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Edit Manuscript
          </span>
          <span className={cn(
            "inline-block rounded-none border px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest",
            post.published 
              ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" 
              : "border-neutral-400 text-neutral-500"
          )}>
            {post.published ? "PUB" : "DFT"}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={isPending}
            className="h-8 font-mono text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Burn
          </Button>
          <div className="h-4 w-px bg-neutral-300" />
          <Button
            type="button"
            variant="ghost"
            onClick={handlePublish}
            disabled={isPending}
            className="h-8 font-mono text-xs font-bold uppercase tracking-widest hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {post.published ? "Unpublish" : "Publish"}
          </Button>
          <Button 
            type="submit" 
            disabled={isPending || !title}
            className="h-8 rounded-none bg-black px-6 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Title Input */}
        <TextareaAutosize
          placeholder="Title"
          className="w-full resize-none bg-transparent font-serif text-5xl font-black leading-tight tracking-tight placeholder:text-muted-foreground/30 focus:outline-none md:text-6xl lg:text-7xl"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          minRows={1}
        />

        {/* Editor */}
        <PostEditor 
          initialContent={content} 
          onChange={setContent} 
        />
      </div>
    </form>
  );
}
