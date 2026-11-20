"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Menu } from "lucide-react";

import { authClient, useSession } from "@/lib/auth-client";
import { ModalSurface } from "@/components/layout/modal-surface";
import { safeCallbackUrl } from "@/lib/redirects";

export function MobileNavigation(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const username =
    session?.user &&
    "username" in session.user &&
    typeof session.user.username === "string"
      ? session.user.username
      : null;
  const links = [
    { href: "/", label: "Journal" },
    { href: "/archive", label: "Archive" },
    { href: "/search", label: "Search" },
    { href: "/new", label: "Write" },
    ...(session?.user
      ? [
          { href: "/library", label: "Library" },
          { href: "/manuscripts", label: "Manuscripts" },
          { href: "/settings", label: "Settings" },
          ...(username ? [{ href: `/@${username}`, label: "Profile" }] : []),
        ]
      : [
          {
            href: `/sign-in?callbackUrl=${encodeURIComponent(safeCallbackUrl(pathname))}`,
            label: "Sign in",
          },
        ]),
  ];
  return (
    <ModalSurface
      open={open}
      onOpenChange={setOpen}
      title="Explore Chronicle"
      description="Stories, writers and your own words."
      drawer
      trigger={
        <button
          type="button"
          aria-label="Open navigation"
          className="flex size-10 items-center justify-center md:hidden"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      }
    >
      <nav
        aria-label="Mobile navigation"
        className="flex flex-col divide-y divide-border"
      >
        {links.map(({ href, label }) => (
          <Link
            key={label}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={pathname === href ? "page" : undefined}
            className="py-4 text-lg hover:text-primary aria-[current=page]:text-primary"
          >
            {label}
          </Link>
        ))}
      </nav>
      {session?.user && (
        <button
          type="button"
          onClick={() => {
            void authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  window.location.href = "/";
                },
              },
            });
          }}
          className="mt-6 py-3 text-sm underline underline-offset-4"
        >
          Sign out
        </button>
      )}
    </ModalSurface>
  );
}
