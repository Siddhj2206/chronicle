"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/layout/image-upload";
import { updateProfile } from "@/actions/users";
import { cn } from "@/lib/utils";

interface SettingsFormProps {
  user: {
    id: string;
    name: string | null;
    bio: string | null;
    image: string | null;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState(user.image || "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("image", imageUrl);

    startTransition(async () => {
      const result = await updateProfile(formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Credentials updated");
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl pt-12">
      <div className="relative border-4 border-black bg-white p-8 dark:border-white dark:bg-black">
        {/* Hole Punch Effect */}
        <div className="absolute -top-6 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full border-4 border-black bg-background dark:border-white" />
        
        {/* Header */}
        <div className="mb-12 mt-4 text-center">
          <h1 className="font-sans text-2xl font-black uppercase tracking-widest">
            Press Credentials
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Chronicle ID: {user.id.slice(-6).toUpperCase()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-12 md:flex-row">
          {/* Left Column: Photo */}
          <div className="flex flex-col gap-4">
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              aspectRatio="square"
              className="w-32"
            />
            <p className="w-32 text-center font-mono text-[10px] uppercase leading-tight text-muted-foreground">
              Official Portrait
            </p>
          </div>

          {/* Right Column: Details */}
          <div className="flex-1 space-y-8">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name || ""}
                required
                className="h-auto rounded-none border-0 border-b-2 border-black px-0 py-2 font-serif text-2xl font-bold focus-visible:ring-0 dark:border-white"
                placeholder="YOUR NAME"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Biography / Beat
              </Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={user.bio || ""}
                placeholder="What do you cover?"
                rows={4}
                className="resize-none rounded-none border-0 border-b-2 border-black px-0 py-2 font-serif text-lg leading-relaxed focus-visible:ring-0 dark:border-white"
              />
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={isPending}
                className="w-full rounded-none bg-black py-6 font-mono text-sm font-bold uppercase tracking-widest text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              >
                {isPending ? "Validating..." : "Update Credentials"}
              </Button>
            </div>
          </div>
        </form>

        {/* Decorative Barcode or ID elements */}
        <div className="mt-12 flex justify-between border-t-2 border-black pt-4 font-mono text-[10px] dark:border-white">
          <div className="flex gap-1">
             {[...Array(12)].map((_, i) => (
                <div key={i} className={cn("h-8 bg-black dark:bg-white", i % 2 === 0 ? "w-1" : "w-3")} />
             ))}
          </div>
          <div className="uppercase tracking-widest text-muted-foreground">
            Auth: Valid
          </div>
        </div>
      </div>
    </div>
  );
}
