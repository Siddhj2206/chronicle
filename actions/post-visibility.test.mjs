import { afterAll, beforeAll, expect, mock, spyOn, test } from "bun:test";
import postgres from "postgres";

let session = null;
let body = "R2 body";
const readContent = mock(async () => body);
mock.module("@/lib/session", () => ({ getSession: async () => session }));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));
mock.module("@/lib/r2-content", () => ({
  getContent: readContent,
  uploadContent: async () => "",
  deleteContent: async () => {},
  revalidateContent: async () => {},
}));

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = databaseUrl ? test : test.skip;
let sql;
let posts;
let comments;
let likes;
const prefix = `visibility-${crypto.randomUUID()}`;
const owner = `${prefix}-owner`;
const other = `${prefix}-other`;
const draft = `${prefix}-draft`;
const published = `${prefix}-published`;

beforeAll(async () => {
  if (!databaseUrl) return;
  process.env.DATABASE_URL = databaseUrl;
  sql = postgres(databaseUrl);
  posts = await import("./posts.ts");
  comments = await import("./comments.ts");
  likes = await import("./likes.ts");
  for (const id of [owner, other]) {
    await sql`INSERT INTO "user" (id, name, email, email_verified, username, created_at, updated_at)
      VALUES (${id}, ${id}, ${id + "@example.com"}, true, ${id}, now(), now())`;
  }
  for (const id of [draft, published]) {
    await sql`INSERT INTO post (id, author_id, title, slug, content, published)
      VALUES (${id}, ${owner}, ${id}, ${id}, 'DB body', ${id === published})`;
  }
});

afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM "user" WHERE id IN (${owner}, ${other})`;
  await sql.end();
});

integration("anonymous and non-owner cannot read drafts, bodies, comments or likes", async () => {
  for (const caller of [null, other]) {
    session = caller ? { user: { id: caller } } : null;
    readContent.mockClear();
    expect(await posts.getPost(owner, draft)).toBeNull();
    expect(await posts.getPostContent(draft)).toBeNull();
    expect(readContent).not.toHaveBeenCalled();
    expect(await comments.getComments(draft)).toEqual([]);
    expect(await likes.getLikeCount(draft)).toBe(0);
    expect(await likes.hasUserLiked(draft)).toBe(false);
    const form = new FormData();
    form.set("content", "Not allowed");
    expect(await comments.addComment(draft, form)).toHaveProperty("error");
    expect(await likes.toggleLike(draft)).toHaveProperty("error");
  }
});

integration("owner can read and edit drafts and interact; published reads are public", async () => {
  session = { user: { id: owner } };
  expect((await posts.getPost(owner, draft)).post.id).toBe(draft);
  expect(await posts.getPostContent(draft)).toBe("R2 body");
  expect((await posts.getPostForEditWithContent(draft)).content).toBe("R2 body");
  body = null;
  expect(await posts.getPostContent(draft)).toBe("DB body");
  body = "R2 body";
  const form = new FormData();
  form.set("content", "Owner comment");
  expect(await comments.addComment(draft, form)).toEqual({ success: true });
  expect(await likes.toggleLike(draft)).toEqual({ success: true, liked: true });
  expect(await likes.hasUserLiked(draft)).toBe(true);
  expect(await likes.getLikeCount(draft)).toBe(1);
  expect(await comments.getComments(draft)).toHaveLength(1);
  for (const caller of [null, other]) {
    session = caller ? { user: { id: caller } } : null;
    expect((await posts.getPost(owner, published)).post.id).toBe(published);
    expect(await posts.getPostContent(published)).toBe("R2 body");
    expect(await comments.getComments(draft)).toEqual([]);
    expect(await likes.getLikeCount(draft)).toBe(0);
  }
});

integration("missing posts fail closed and only published posts accrue views", async () => {
  session = { user: { id: owner } };
  expect(await posts.getPost(owner, "missing")).toBeNull();
  expect(await posts.getPostContent("missing")).toBeNull();
  expect(await comments.getComments("missing")).toEqual([]);
  expect(await likes.getLikeCount("missing")).toBe(0);
  expect(await likes.toggleLike("missing")).toHaveProperty("error");
  await posts.incrementViewCount(draft);
  await posts.incrementViewCount(published);
  const rows = await sql`SELECT id, view_count FROM post WHERE id IN (${draft}, ${published})`;
  expect(rows.find((row) => row.id === draft).view_count).toBe(0);
  expect(rows.find((row) => row.id === published).view_count).toBe(1);
});

integration("body read failures return null rather than exposing content", async () => {
  session = { user: { id: owner } };
  const log = spyOn(console, "error").mockImplementation(() => {});
  readContent.mockRejectedValueOnce(new Error("Storage unavailable"));
  try {
    expect(await posts.getPostContent(draft)).toBeNull();
    expect(log).toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});
