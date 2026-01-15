import Link from "next/link";

// Hoisted to module scope - year won't change during session
const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t-4 border-black bg-background dark:border-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Main Footer Content */}
        <div className="mb-8 grid gap-8 md:grid-cols-3">
          {/* Brand Column */}
          <div>
            <Link href="/" className="inline-block">
              <h2 className="font-serif text-2xl font-black uppercase tracking-tight">
                The Chronicle
              </h2>
            </Link>
            <p className="mt-2 font-serif text-sm italic text-muted-foreground">
              All the news that fits in the viewport.
            </p>
          </div>

          {/* Navigation Column */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Navigation
            </h3>
            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                className="font-serif text-sm hover:underline"
              >
                Home
              </Link>
              <Link
                href="/search"
                className="font-serif text-sm hover:underline"
              >
                Search Articles
              </Link>
              <Link
                href="/manuscripts"
                className="font-serif text-sm hover:underline"
              >
                My Posts
              </Link>
              <Link
                href="/new"
                className="font-serif text-sm hover:underline"
              >
                Write Article
              </Link>
            </nav>
          </div>

          {/* Info Column */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              About
            </h3>
            <p className="font-serif text-sm leading-relaxed text-muted-foreground">
              Chronicle is a platform for writers and readers who appreciate
              thoughtful, long-form content presented in a classic editorial
              style.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              &copy; {CURRENT_YEAR} The Chronicle. All rights reserved.
            </p>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Est. 2026
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
