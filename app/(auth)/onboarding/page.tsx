"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/layout/image-upload";
import { checkUsernameAvailable, setUsername, updateAvatar } from "@/actions/users";
import { useSession } from "@/lib/auth-client";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const { data: session, refetch } = useSession();
  const [isPending, startTransition] = useTransition();
  const [username, setUsernameValue] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Use custom image if set, otherwise fall back to Google avatar
  const imageUrl = customImageUrl ?? session?.user?.image ?? "";

  function handleImageChange(url: string) {
    setCustomImageUrl(url);
  }

  async function handleCheck() {
    if (!username) return;

    const result = await checkUsernameAvailable(username);
    if (result.error) {
      setError(result.error);
      setIsAvailable(false);
    } else {
      setError(null);
      setIsAvailable(result.available);
      if (!result.available) {
        setError("Handle already assigned");
      }
    }
  }

  function handleSubmit() {
    if (!username || !isAvailable) return;

    startTransition(async () => {
      const result = await setUsername(username);
      if (result.success) {
        // Update avatar if one was uploaded
        if (imageUrl) {
          await updateAvatar(imageUrl);
        }
        toast.success("Credentials Issued");
        await refetch();
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(result.error || "Something went wrong");
      }
    });
  }

  return (
    <div className="w-full max-w-md p-4">
      <div className="relative border-4 border-black bg-white p-8 dark:border-white dark:bg-black">
        {/* Hole Punch Effect */}
        <div className="absolute -top-6 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full border-4 border-black bg-background dark:border-white" />

        <div className="mb-12 mt-4 text-center">
          <h1 className="font-sans text-2xl font-black uppercase tracking-widest">
            Issue Credentials
          </h1>
          <p className="mt-2 font-serif text-sm italic text-muted-foreground">
            &quot;Set up your byline and portrait.&quot;
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-10"
        >
          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-3">
            <ImageUpload
              value={imageUrl}
              onChange={handleImageChange}
              aspectRatio="square"
              className="w-28"
            />
            <p className="text-center font-mono text-[10px] uppercase leading-tight text-muted-foreground">
              Official Portrait
            </p>
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <Label htmlFor="username" className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Requested Handle
            </Label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 font-serif text-2xl font-bold text-muted-foreground">
                @
              </span>
              <Input
                id="username"
                name="username"
                placeholder="editor…"
                value={username}
                autoComplete="username"
                spellCheck={false}
                className="h-auto rounded-none border-0 border-b-2 border-black py-2 pl-8 font-serif text-2xl font-bold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white"
                onChange={(e) => {
                  setUsernameValue(e.target.value);
                  setIsAvailable(null);
                  setError(null);
                }}
                onBlur={handleCheck}
              />
            </div>
            
            {/* Status Messages */}
            <div className="h-6 pt-2 font-mono text-[10px] uppercase tracking-widest">
              {error && (
                <p className="text-destructive">Error: {error}</p>
              )}
              {isAvailable && (
                <p className="text-green-600 dark:text-green-400">Status: Available</p>
              )}
              {!error && !isAvailable && username && (
                 <p className="text-muted-foreground">Status: Checking…</p>
              )}
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isPending || !isAvailable} 
            className="w-full rounded-none bg-black py-6 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            {isPending ? "Issuing..." : "Confirm Credentials"}
          </Button>
        </form>

        <div className="mt-8 border-t-2 border-black pt-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground dark:border-white">
          Chronicle ID System v1.0
        </div>
      </div>
    </div>
  );
}

function OnboardingFallback() {
  return (
    <div className="w-full max-w-md p-4">
      <Skeleton className="h-[500px] w-full" />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingContent />
    </Suspense>
  );
}
