import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/layout/empty-state";
import { NotFoundView } from "@/components/layout/not-found-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { shortcutAction } from "@/lib/shortcuts";

describe("keyboard shortcut mapping", () => {
  it("supports search, help and the home sequence", () => {
    expect(shortcutAction("/", false, false)).toBe("search");
    expect(shortcutAction("?", false, false)).toBe("help");
    expect(shortcutAction("g", false, false)).toBe("prefix");
    expect(shortcutAction("H", false, true)).toBe("home");
    expect(shortcutAction("h", false, false)).toBeUndefined();
  });
  it.each(["n", "c", "N", "C"])(
    "only enables %s for signed-in writers",
    (key) => {
      expect(shortcutAction(key, true, false)).toBe("new");
      expect(shortcutAction(key, false, false)).toBeUndefined();
    },
  );
  it.each(["", "Enter", "Escape", "x"])("ignores an unmapped key %s", (key) => {
    expect(shortcutAction(key, true, true)).toBeUndefined();
  });
});

describe("monograph status surfaces", () => {
  it("renders an empty state with an optional recovery action", () => {
    const props = {
      title: "No stories yet.",
      description: "Make room for another idea.",
    };
    const plain = renderToStaticMarkup(createElement(EmptyState, props));
    expect(plain).toContain("<h2");
    expect(plain).toContain(props.description);
    expect(plain).not.toContain("<a");
    const action = renderToStaticMarkup(
      createElement(EmptyState, {
        ...props,
        action: { href: "/new", label: "Start writing" },
      }),
    );
    expect(action).toContain('href="/new"');
    expect(action).toContain("Start writing</a>");
  });
  it("renders error recovery links and safely escapes descriptions", () => {
    const html = renderToStaticMarkup(
      createElement(NotFoundView, {
        title: "Story Not Found",
        description: "<script>missing</script>",
      }),
    );
    expect(html).toContain("404");
    expect(html).toContain("<h1");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/archive"');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it.each(["home", "article", "profile", "archive"] as const)(
    "provides accessible %s skeletons with reduced-motion support",
    (layout) => {
      const html = renderToStaticMarkup(
        createElement(PageSkeleton, { layout }),
      );
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Loading ');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('data-slot="skeleton"');
      expect(html).toContain("motion-reduce:");
    },
  );
});
