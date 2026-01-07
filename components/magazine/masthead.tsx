"use client";

import Link from "next/link";
import { Navbar } from "@/components/magazine/navbar";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/culture", label: "Culture" },
  { href: "/technology", label: "Technology" },
  { href: "/design", label: "Design" },
  { href: "/business", label: "Business" },
  { href: "/politics", label: "Politics" },
  { href: "/science", label: "Science" },
  { href: "/health", label: "Health" },
  { href: "/style", label: "Style" },
  { href: "/travel", label: "Travel" },
];

export function Masthead() {
  return (
    <header className="flex flex-col border-b border-border bg-background text-foreground">
      {/* Top Utility Bar */}
      <Navbar />

      {/* Main Logo Area */}
      <div className="py-8 text-center md:py-12">
        <Link href="/" className="inline-block">
          <h1 className="font-serif text-5xl font-black tracking-tighter md:text-7xl lg:text-8xl">
            The Chronicle
          </h1>
        </Link>
        <p className="mt-2 font-serif text-sm italic text-muted-foreground">
          "All the news that fits in the viewport."
        </p>
      </div>
    </header>
  );
}
