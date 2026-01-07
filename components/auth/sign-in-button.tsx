"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  return (
    <Button
      onClick={() =>
        authClient.signIn.social({
          provider: "google",
          callbackURL: "/dashboard",
        })
      }
    >
      Sign in with Google
    </Button>
  );
}
