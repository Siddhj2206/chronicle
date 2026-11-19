export function Masthead(): React.JSX.Element {
  return (
    <header className="mx-auto max-w-2xl py-12 text-center md:py-20">
      <h1 className="font-serif text-4xl font-normal leading-tight md:text-6xl">
        A little room for perspective.
      </h1>
      <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
        Stories, ideas, and the things worth noticing.
      </p>
    </header>
  );
}
