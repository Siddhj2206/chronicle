"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/lib/auth-client";
import { UserMenu } from "@/components/auth/user-menu";
import { SearchInput } from "@/components/layout/search-input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { cn } from "@/lib/utils";
import { safeCallbackUrl } from "@/lib/redirects";

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps): React.JSX.Element {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className={cn("site-header", className)}>
      <div className="site-nav">
        <Link href="/" className="site-brand">
          Chronicle
        </Link>
        <nav
          aria-label="Main navigation"
          className="site-links !hidden md:!flex"
        >
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className="hover:text-primary aria-[current=page]:text-foreground"
          >
            Journal
          </Link>
          <Link
            href="/archive"
            aria-current={pathname === "/archive" ? "page" : undefined}
            className="hover:text-primary aria-[current=page]:text-foreground"
          >
            Archive
          </Link>
        </nav>
        <div className="site-tools">
          <div className="hidden md:block">
            <SearchInput />
          </div>
          <ThemeToggle />
          <MobileNavigation />
          <div className="hidden items-center gap-6 md:flex">
            {session?.user ? (
              <>
                <Link href="/new" className="site-signin">
                  Write
                </Link>
                <UserMenu user={session.user} />
              </>
            ) : (
              <Link
                href={`/sign-in?callbackUrl=${encodeURIComponent(safeCallbackUrl(pathname))}`}
                className="site-signin"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
