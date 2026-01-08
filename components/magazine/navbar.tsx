"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/user-menu";
import { SearchInput } from "@/components/layout/search-input";
import { cn } from "@/lib/utils";

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={cn("border-b border-border py-2 bg-background", className)}>
      <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <div className="flex items-center gap-4">
          {isHomePage ? (
            <>
              <Link href="/" className="font-bold text-foreground hover:underline md:hidden">
                The Chronicle
              </Link>
              <div className="hidden md:block">{today}</div>
            </>
          ) : (
            <Link href="/" className="font-serif text-xl font-black tracking-tight text-foreground hover:opacity-80">
              The Chronicle
            </Link>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <SearchInput />
          <div className="flex items-center gap-2">
            {session?.user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-7 text-xs font-bold uppercase tracking-widest"
                >
                  <Link href="/new">Write</Link>
                </Button>
                <UserMenu user={session.user} />
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-7 text-xs font-bold uppercase tracking-widest"
              >
                <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
