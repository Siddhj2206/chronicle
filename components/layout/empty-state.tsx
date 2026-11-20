import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: { href: string; label: string };
}

export function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps): React.JSX.Element {
  return (
    <section className="max-w-xl py-12 md:py-16">
      <h2 className="font-serif text-3xl leading-tight">{title}</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-block text-sm underline underline-offset-4 hover:text-primary"
        >
          {action.label}
        </Link>
      )}
    </section>
  );
}
