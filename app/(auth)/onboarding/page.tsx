"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkUsernameAvailable, setUsername } from "@/actions/users";

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [username, setUsernameValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

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
        setError("Username is already taken");
      }
    }
  }

  function handleSubmit() {
    if (!username || !isAvailable) return;

    startTransition(async () => {
      const result = await setUsername(username);
      if (result.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(result.error || "Something went wrong");
      }
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-serif">Choose your username</CardTitle>
        <CardDescription>
          This will be your unique identifier on Chronicle.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <Input
                id="username"
                placeholder="johndoe"
                value={username}
                onChange={(e) => {
                  setUsernameValue(e.target.value);
                  setIsAvailable(null);
                  setError(null);
                }}
                onBlur={handleCheck}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {isAvailable && (
              <p className="text-sm text-primary">Username is available!</p>
            )}
          </div>
          <Button type="submit" disabled={isPending || !isAvailable} className="w-full">
            {isPending ? "Setting up..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
