"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/lib/auth-client";
import { UserMenu } from "@/components/auth/user-menu";
import { SearchInput } from "@/components/layout/search-input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps): React.JSX.Element {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className={cn("bg-background font-sans text-sm", className)}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-5 md:py-7">
        <Link href="/" className="font-serif text-2xl font-medium tracking-tight hover:text-primary">
          Chronicle
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 text-muted-foreground md:flex">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className="hover:text-primary aria-[current=page]:text-foreground">Stories</Link>
          <Link href="/archive" aria-current={pathname === "/archive" ? "page" : undefined} className="hover:text-primary aria-[current=page]:text-foreground">Archive</Link>
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          <SearchInput />
          <ThemeToggle />
          {session?.user ? (
            <>
              <Link href="/new" className="rounded-full bg-primary px-4 py-2 text-primary-foreground hover:opacity-90">Write</Link>
              <UserMenu user={session.user} />
            </>
          ) : (
            <Link href={`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`} className="rounded-full bg-primary px-4 py-2 text-primary-foreground hover:opacity-90">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
