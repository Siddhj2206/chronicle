import Link from "next/link";

export function Footer(): React.JSX.Element {
  return (
    <footer className="bg-background font-sans text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="font-serif text-xl text-foreground hover:text-primary"
        >
          Chronicle
        </Link>
        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-x-6 gap-y-3"
        >
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <Link href="/search" className="hover:text-primary">
            Search articles
          </Link>
          <Link href="/manuscripts" className="hover:text-primary">
            My posts
          </Link>
          <Link href="/new" className="hover:text-primary">
            Write an article
          </Link>
        </nav>
        <p className="text-label">A space for thoughtful stories.</p>
      </div>
    </footer>
  );
}
