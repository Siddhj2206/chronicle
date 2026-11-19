"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import type { ArticleHeading } from "@/lib/reading";

export function ArticleContents({
  headings,
}: {
  headings: ArticleHeading[];
}): React.JSX.Element | null {
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length < 3) return;
    const elements = headings
      .map(({ id }) => document.getElementById(id))
      .filter((element) => element !== null);
    let frame = 0;
    function update(): void {
      frame = 0;
      const above = elements.filter(
        (element) => element.getBoundingClientRect().top <= 160,
      );
      setActive((above.at(-1) ?? elements[0])?.id ?? "");
    }
    function schedule(): void {
      if (!frame) frame = requestAnimationFrame(update);
    }
    const observer = new IntersectionObserver(schedule, {
      rootMargin: "-112px 0px -60% 0px",
      threshold: 0,
    });
    elements.forEach((element) => observer.observe(element));
    window.addEventListener("scroll", schedule, { passive: true });
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, [headings]);

  if (headings.length < 3) return null;

  const links = (
    <ol className="space-y-3 text-[13px] leading-relaxed">
      {headings.map((heading) => (
        <li key={heading.id} className={cn(heading.level === 3 && "pl-3")}>
          <a
            href={`#${heading.id}`}
            aria-current={active === heading.id ? "location" : undefined}
            className="block text-muted-foreground hover:text-primary aria-[current=location]:text-primary"
            onClick={() => setActive(heading.id)}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <aside className="mb-10 min-w-0 max-w-[680px] xl:mb-0 xl:self-stretch">
      <nav
        aria-label="Table of contents"
        className="hidden xl:sticky xl:top-28 xl:block xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto xl:pr-8"
      >
        <h2 className="mb-5 text-sm text-foreground">Contents</h2>
        {links}
      </nav>
      <details className="border-y border-border py-4 xl:hidden">
        <summary className="cursor-pointer text-sm">Contents</summary>
        <nav aria-label="Table of contents" className="pt-5">
          {links}
        </nav>
      </details>
    </aside>
  );
}
