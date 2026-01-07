"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateProfile } from "@/actions/users";

interface SettingsFormProps {
  user: {
    name: string | null;
    bio: string | null;
    image: string | null;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProfile(formData);

      if (result.error) {
        setError(result.error);
        setSuccess(false);
      } else {
        setError(null);
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Profile Settings</CardTitle>
        <CardDescription>Update your profile information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user.name || ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={user.bio || ""}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Avatar URL</Label>
            <Input
              id="image"
              name="image"
              type="url"
              defaultValue={user.image || ""}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-sm text-primary">Profile updated successfully!</p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
