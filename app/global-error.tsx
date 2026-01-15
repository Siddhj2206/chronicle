"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mb-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            ━━━ EXTRA! EXTRA! ━━━
          </div>
          <h1 className="mb-4 font-serif text-4xl font-black">
            Something went wrong!
          </h1>
          <p className="mb-8 font-serif text-muted-foreground">
            The presses have stopped. An unexpected error has occurred.
          </p>
          {error.digest && (
            <p className="mb-4 font-mono text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
          <Button
            onClick={reset}
            className="rounded-none bg-black px-8 py-6 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
