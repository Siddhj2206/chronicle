"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostEditor } from "@/components/posts/post-editor";
import { createPost, publishPost } from "@/actions/posts";

export default function NewPostPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData, publish: boolean) {
    formData.set("content", content);

    startTransition(async () => {
      const result = await createPost(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success && result.slug) {
        if (publish) {
          await publishPost(result.slug);
        }
        router.push("/dashboard");
      }
    });
  }

  return (
    <div>
      <h1 className="mb-8 font-serif text-3xl font-semibold">Create New Post</h1>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Post Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter your post title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt (optional)</Label>
              <Textarea
                id="excerpt"
                name="excerpt"
                placeholder="Brief description of your post"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image URL (optional)</Label>
              <Input
                id="coverImage"
                name="coverImage"
                type="url"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <PostEditor onChange={setContent} />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget.closest("form");
                  if (form) {
                    handleSubmit(new FormData(form), false);
                  }
                }}
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget.closest("form");
                  if (form) {
                    handleSubmit(new FormData(form), true);
                  }
                }}
              >
                {isPending ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
