"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import { createPost } from "@/actions/posts";
import { Button } from "@/components/ui/button";
import { PostEditor } from "@/components/posts/post-editor";

export default function NewPostPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      
      // Temporary: We will add image upload later
      // formData.append("coverImage", coverImage);

      const result = await createPost(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Manuscript created");
      router.push(`/edit/${result.slug}`);
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl pb-20">
      {/* Header Actions */}
      <div className="mb-12 flex items-center justify-between border-b-4 border-black pb-4 dark:border-white">
        <span className="font-mono text-sm font-bold uppercase tracking-widest text-muted-foreground">
          New Manuscript
        </span>
        <Button 
          type="submit" 
          disabled={isPending || !title}
          className="rounded-none bg-black px-8 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          {isPending ? "Saving..." : "Save Draft"}
        </Button>
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
