"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostEditor } from "@/components/posts/post-editor";
import { updatePost, publishPost, unpublishPost, deletePost } from "@/actions/posts";

import type { Post } from "@/lib/db/schema";

interface EditPostFormProps {
  post: Post;
}

export function EditPostForm({ post }: EditPostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState(post.content);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("content", content);

    startTransition(async () => {
      const result = await updatePost(post.slug, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/dashboard");
    });
  }

  async function handlePublish() {
    startTransition(async () => {
      if (post.published) {
        await unpublishPost(post.slug);
      } else {
        await publishPost(post.slug);
      }
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    startTransition(async () => {
      const result = await deletePost(post.slug);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/dashboard");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Edit Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={post.title}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt (optional)</Label>
            <Textarea
              id="excerpt"
              name="excerpt"
              defaultValue={post.excerpt || ""}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImage">Cover Image URL (optional)</Label>
            <Input
              id="coverImage"
              name="coverImage"
              type="url"
              defaultValue={post.coverImage || ""}
            />
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <PostEditor initialContent={post.content} onChange={setContent} />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex flex-wrap gap-3 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={handlePublish}
            >
              {post.published ? "Unpublish" : "Publish"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
