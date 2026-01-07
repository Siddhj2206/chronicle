"use client";

import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/user-menu";
import { SearchInput } from "@/components/layout/search-input";

export function Navbar() {
  const { data: session } = authClient.useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
          Chronicle
        </Link>

        <div className="hidden md:block">
          <SearchInput />
        </div>

        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/new">Write</Link>
              </Button>
              <UserMenu user={session.user as { id: string; name: string; email: string; image?: string | null; username?: string | null }} />
            </>
          ) : (
            <Button asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
