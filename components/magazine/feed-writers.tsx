import Image from "next/image";
import Link from "next/link";

import type { User } from "@/lib/db/schema";

export function FeedWriters({
  writers,
}: {
  writers: Pick<User, "id" | "name" | "username" | "image">[];
}): React.JSX.Element | null {
  if (!writers.length) return null;
  return (
    <section aria-label="Writers" className="mt-10 border-t border-border pt-6">
      <h2 className="text-xs text-muted-foreground">Writers</h2>
      <ul className="mt-5 space-y-5">
        {writers.map((writer) => (
          <li key={writer.id}>
            <Link
              href={`/@${writer.username}`}
              className="flex items-center gap-3 text-sm hover:underline"
            >
              <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden bg-muted font-serif text-2xl">
                {writer.image ? (
                  <Image
                    src={writer.image}
                    alt=""
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <span aria-hidden="true">
                    {Array.from(writer.name.trim())[0] || "C"}
                  </span>
                )}
              </span>
              {writer.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
