"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ImageUpload } from "@/components/layout/image-upload";
import { updateProfile, deleteAccount } from "@/actions/users";
import { useSession, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// Hoisted to module scope to avoid recreation on every render
const BARCODE_BARS = Array.from({ length: 12 }, (_, i) => i);

interface SettingsFormProps {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    bio: string | null;
    image: string | null;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const { refetch } = useSession();
  const [isPending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState(user.image || "");
  const [confirmUsername, setConfirmUsername] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
        await refetch();
        router.refresh();
      }
    });
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    const result = await deleteAccount(confirmUsername);

    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
    } else {
      toast.success("Account deleted");
      await signOut();
      router.push("/");
    }
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

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-12 md:flex-row"
        >
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
              <Label
                htmlFor="name"
                className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name || ""}
                required
                autoComplete="name"
                className="h-auto rounded-none border-0 border-b-2 border-black px-0 py-2 font-serif text-2xl font-bold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white"
                placeholder="Your name…"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Username
              </Label>
              <div className="flex items-center border-b-2 border-black dark:border-white">
                <span className="font-mono text-lg text-muted-foreground">
                  @
                </span>
                <Input
                  id="username"
                  name="username"
                  defaultValue={user.username || ""}
                  autoComplete="username"
                  spellCheck={false}
                  className="h-auto rounded-none border-0 px-1 py-2 font-mono text-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="username…"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="bio"
                className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Biography
              </Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={user.bio || ""}
                autoComplete="off"
                placeholder="What do you cover?…"
                rows={4}
                className="resize-none rounded-none border-0 border-b-2 border-black px-0 py-2 font-serif text-lg leading-relaxed focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white"
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
            {BARCODE_BARS.map((i) => (
              <div
                key={i}
                className={cn(
                  "h-8 bg-black dark:bg-white",
                  i % 2 === 0 ? "w-1" : "w-3",
                )}
              />
            ))}
          </div>
          <div className="uppercase tracking-widest text-muted-foreground">
            Auth: Valid
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 border-2 border-destructive/50 bg-destructive/5 p-6">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-destructive">
          Danger Zone
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Once you delete your account, all your posts, comments, and data will
          be permanently removed. This action cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-4">
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and all associated
                data including posts, comments, and uploaded images. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <Label htmlFor="confirm-username">
                Type your username <strong>@{user.username}</strong> to confirm:
              </Label>
              <Input
                id="confirm-username"
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                placeholder={user.username || ""}
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmUsername("")}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={
                  confirmUsername.toLowerCase() !==
                    user.username?.toLowerCase() || isDeleting
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
