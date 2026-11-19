import Link from "next/link";

export function NotFoundView({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="mx-auto grid max-w-[1120px] gap-8 py-12 md:grid-cols-[1fr_2fr] md:gap-16 md:py-24">
      <p className="font-serif text-[112px] leading-none tracking-tight text-muted-foreground md:text-[180px]">
        404
      </p>
      <div className="self-center border-t border-border pt-8">
        <h1 className="max-w-2xl font-serif text-[44px] leading-[1.05] tracking-tight md:text-[72px]">
          {title}
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
        <nav
          aria-label="Find another story"
          className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-sm"
        >
          <Link
            href="/"
            className="underline underline-offset-4 hover:text-primary"
          >
            Back to the journal
          </Link>
          <Link
            href="/archive"
            className="underline underline-offset-4 hover:text-primary"
          >
            Explore the archive
          </Link>
        </nav>
      </div>
    </div>
  );
}
