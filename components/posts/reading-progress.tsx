"use client";

import { useEffect, useRef } from "react";

export function ReadingProgress(): React.JSX.Element {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const article = document.querySelector("[data-reading-body]");
    if (!article) return;
    let frame = 0;
    function update(): void {
      frame = 0;
      const bounds = article!.getBoundingClientRect();
      const distance = Math.max(1, bounds.height - window.innerHeight + 112);
      const progress = Math.min(1, Math.max(0, (112 - bounds.top) / distance));
      if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
    }
    function schedule(): void {
      if (!frame) frame = requestAnimationFrame(update);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(article);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      data-testid="reading-progress"
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
    >
      <div
        ref={bar}
        className="h-full origin-left bg-primary motion-reduce:transition-none"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
