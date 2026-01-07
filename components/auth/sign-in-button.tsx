"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  return (
    <Button
      className="w-full rounded-none bg-black py-6 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      onClick={() =>
        authClient.signIn.social({
          provider: "google",
          callbackURL: "/dashboard",
        })
      }
    >
      Authenticate via Google
    </Button>
  );
}
