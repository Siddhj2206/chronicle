import Link from "next/link";

export function Footer(): React.JSX.Element {
  return (
    <footer className="site-footer-wrap">
      <div className="site-footer">
        <Link href="/" className="text-foreground">
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
      </div>
    </footer>
  );
}
