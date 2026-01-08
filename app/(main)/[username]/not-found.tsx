import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ProfileNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="relative w-full max-w-lg border-4 border-black bg-white p-8 text-center dark:border-white dark:bg-black">
        {/* Hole Punch Effect */}
        <div className="absolute -top-6 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full border-4 border-black bg-background dark:border-white" />

        {/* Header */}
        <div className="mb-8 mt-4">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            ━━━ CREDENTIALS REVOKED ━━━
          </p>
          <h1 className="mt-4 font-serif text-4xl font-black uppercase tracking-tight md:text-5xl">
            Correspondent Not Found
          </h1>
        </div>

        {/* Error Code */}
        <div className="mb-8 border-y-2 border-black py-4 dark:border-white">
          <p className="font-mono text-6xl font-black tracking-tighter text-muted-foreground">
            404
          </p>
        </div>

        {/* Message */}
        <p className="mx-auto max-w-sm font-serif text-lg italic leading-relaxed text-muted-foreground">
          &ldquo;This reporter&apos;s credentials have expired, been revoked, or
          never existed in our records.&rdquo;
        </p>

        {/* Button */}
        <div className="mt-8">
          <Button
            asChild
            className="rounded-none bg-black px-8 py-6 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            <Link href="/">Return to Front Page</Link>
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t-2 border-black pt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground dark:border-white">
          The Chronicle • Est. 2026
        </div>
      </div>
    </div>
  );
}
