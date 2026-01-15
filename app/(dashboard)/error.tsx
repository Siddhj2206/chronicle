"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        ━━━ Dashboard Error ━━━
      </div>
      <h1 className="mb-4 font-serif text-3xl font-black">
        Something Went Wrong
      </h1>
      <p className="mb-8 max-w-md font-serif text-muted-foreground">
        We couldn&apos;t load your dashboard. Your manuscripts are safe - please
        try again.
      </p>
      {error.digest && (
        <p className="mb-6 font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      )}
      <div className="flex gap-4">
        <Button
          onClick={reset}
          className="rounded-none bg-black px-6 py-5 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          Try again
        </Button>
        <Button
          asChild
          variant="outline"
          className="rounded-none border-2 border-black px-6 py-5 font-mono text-xs font-bold uppercase tracking-widest dark:border-white"
        >
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
