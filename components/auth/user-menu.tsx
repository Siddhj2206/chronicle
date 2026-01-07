"use client";

import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    username?: string | null;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Avatar>
            <AvatarImage src={user.image || undefined} alt={user.name || ""} />
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div>{user.name}</div>
          {user.username && <div>@{user.username}</div>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">My Posts</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/new">New Post</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        {user.username && (
          <DropdownMenuItem asChild>
            <Link href={`/@${user.username}`}>View Profile</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/" } } })}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
