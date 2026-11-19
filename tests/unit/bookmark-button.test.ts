import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it, vi } from "vitest";

import { BookmarkButton } from "@/components/posts/bookmark-button";
import { BookmarkProvider } from "@/components/posts/bookmark-provider";

import type { BookmarkViewer } from "@/lib/bookmarks";

vi.mock("next/navigation", () => ({
  usePathname: () => "/@author/story",
  useRouter: () => ({ refresh: vi.fn() }),
}));

function render(viewer: BookmarkViewer, compact = false): string {
  return renderToStaticMarkup(
    createElement(
      BookmarkProvider,
      { viewer },
      createElement(BookmarkButton, { postId: "story", compact }),
    ),
  );
}

describe("bookmark controls", () => {
  it("uses the sign-in prompt with a safe return path and an accessible icon", () => {
    const html = render({ userId: null, savedIds: [] });
    expect(html).toContain('aria-label="Sign in to save story"');
    expect(html).toContain('href="/sign-in?callbackUrl=%2F%40author%2Fstory"');
    expect(html).toContain('aria-hidden="true"');
  });
  it("distinguishes saved, unsaved and compact card controls", () => {
    expect(render({ userId: "reader", savedIds: [] })).toContain(
      'aria-pressed="false"',
    );
    const saved = render({ userId: "reader", savedIds: ["story"] });
    expect(saved).toContain('aria-pressed="true"');
    expect(saved).toContain('aria-label="Remove story from reading list"');
    expect(saved).toContain("Saved");
    expect(render({ userId: "reader", savedIds: [] }, true)).toContain(
      'data-size="icon-sm"',
    );
  });
  it("disables mutations while status is unavailable", () => {
    const html = render({ userId: "reader", savedIds: null });
    expect(html).toContain('aria-label="Reading list unavailable"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("Refresh the page to try again.");
  });
});
