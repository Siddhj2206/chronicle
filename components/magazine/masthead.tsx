import Link from "next/link";

export function Masthead() {
  return (
    <header className="border-b border-border bg-background text-foreground">
      {/* Main Logo Area */}
      <div className="py-8 text-center md:py-12">
        <Link href="/" className="inline-block">
          <h1 className="font-serif text-5xl font-black tracking-tighter md:text-7xl lg:text-8xl">
            The Chronicle
          </h1>
        </Link>
        <p className="mt-2 font-serif text-sm italic text-muted-foreground">
          &quot;All the news that fits in the viewport.&quot;
        </p>
      </div>
    </header>
  );
}
