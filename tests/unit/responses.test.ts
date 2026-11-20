import { renderToStaticMarkup } from "react-dom/server";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { getComments } from "@/actions/comments";
import { CommentList } from "@/components/comments/comment-list";
import { mockSession } from "@/tests/helpers/session";

import type { ResponseWithAuthor } from "@/actions/comments";
import type { User } from "@/lib/db/schema";

vi.mock("@/actions/comments", () => ({
  getComments: vi.fn(),
  addComment: vi.fn(),
  replyToComment: vi.fn(),
  toggleAuthorLike: vi.fn(),
  deleteComment: vi.fn(),
}));

const now = new Date("2025-01-01");
const owner: User = {
  id: "owner",
  name: "Mira Ellis",
  username: "mira",
  image: null,
  email: "mira@example.test",
  emailVerified: true,
  createdAt: now,
  updatedAt: now,
  bio: null,
};
const root: ResponseWithAuthor = {
  comment: {
    id: "root",
    postId: "post",
    authorId: "reader",
    content: "A good question",
    parentId: null,
    likedByAuthor: true,
    createdAt: now,
    updatedAt: now,
  },
  author: { id: "reader", name: "Alex Morgan", username: "alex", image: null },
};
const reply: ResponseWithAuthor = {
  ...root,
  comment: {
    ...root.comment,
    id: "reply",
    parentId: "root",
    content: "A thoughtful reply",
    likedByAuthor: false,
  },
};
const props = {
  postId: "post",
  postAuthorId: owner.id,
  articlePath: "/@mira/story",
};

beforeEach(() => {
  mockSession(null);
  vi.mocked(getComments).mockResolvedValue([]);
});

describe("threaded response rendering", () => {
  it("renders the existing empty state without fabricated responses", async () => {
    const html = renderToStaticMarkup(await CommentList(props));
    expect(html).toContain("The conversation starts here.");
    expect(html).not.toContain("comment-entry");
  });

  it("groups replies under their parent and shows signed-out reply links and author marks", async () => {
    vi.mocked(getComments).mockResolvedValue([reply, root]);
    const html = renderToStaticMarkup(await CommentList(props));
    expect(html.indexOf('id="response-root"')).toBeLessThan(
      html.indexOf('id="response-reply"'),
    );
    expect(html).toContain('role="group" aria-label="Replies to Alex Morgan"');
    expect(html).toContain("Liked by author");
    expect(html).toContain("/sign-in?callbackUrl=%2F%40mira%2Fstory");
    expect(html).not.toContain("Like as author");
    expect(html).not.toContain(">Delete<");
  });

  it("exposes endorsement toggles and moderation only to the post author", async () => {
    vi.mocked(getComments).mockResolvedValue([root, reply]);
    mockSession(owner);
    const html = renderToStaticMarkup(await CommentList(props));
    expect(html).toContain("Remove author like");
    expect(html).toContain("Like as author");
    expect(html).toContain('aria-pressed="true"');
    expect(html.match(/>Delete</g)).toHaveLength(2);
    mockSession({ ...owner, id: "other" });
    const other = renderToStaticMarkup(await CommentList(props));
    expect(other).not.toContain("Like as author");
    expect(other).not.toContain("Remove author like");
    expect(other).not.toContain(">Delete<");
    expect(other).toContain("Liked by author");
  });
});
