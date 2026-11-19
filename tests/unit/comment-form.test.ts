import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it, vi } from "vitest";

import { CommentForm } from "@/components/comments/comment-form";
import { PostContent } from "@/components/posts/post-content";

vi.mock("@/actions/comments", () => ({ addComment: vi.fn() }));

const props = {
  postId: "post",
  isLoggedIn: true,
  articlePath: "/@writer/story",
};

describe("comment form identifiers", () => {
  it("associates each label with its own field without colliding with headings", () => {
    const html = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        createElement(PostContent, {
          content: "## Comment\n\n## Comment error",
        }),
        createElement(CommentForm, props),
        createElement(CommentForm, props),
      ),
    );
    const ids = [...html.matchAll(/<textarea[^>]*\sid="([^"]+)"/g)].map(
      ([, id]) => id,
    );
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(html).toContain('id="comment"');
    expect(html).toContain('id="comment-error"');
    for (const id of ids) {
      expect(id).not.toBe("comment");
      expect(id).not.toBe("comment-error");
      expect(html).toContain(`for="${id}"`);
    }
  });

  it("does not render a comment field for signed-out readers", () => {
    const html = renderToStaticMarkup(
      createElement(CommentForm, { ...props, isLoggedIn: false }),
    );
    expect(html).toContain("Sign in to join the conversation.");
    expect(html).not.toContain("<textarea");
  });
});
