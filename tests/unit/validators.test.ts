import { describe, expect, it } from "vitest";

import { commentSchema, postSchema, profileSchema, usernameSchema } from "@/lib/validators";

describe("validators", () => {
  it.each(["reader", "Writer_123", "x".repeat(20)])("accepts username %s", (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(true);
  });
  it.each(["", "ab", "x".repeat(21), "bad-name", "ADMIN", "api"])("rejects username %s", (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });
  it("accepts minimal posts and optional empty cover images", () => {
    expect(postSchema.safeParse({ title: "Title", content: "Body", coverImage: "" }).success).toBe(true);
  });
  it.each([
    { title: "", content: "Body" }, { title: "Title", content: "" },
    { title: "x".repeat(201), content: "Body" },
    { title: "Title", content: "Body", excerpt: "x".repeat(301) },
    { title: "Title", content: "Body", coverImage: "not-a-url" },
  ])("rejects invalid posts %j", (value) => {
    expect(postSchema.safeParse(value).success).toBe(false);
  });
  it("enforces comment boundaries", () => {
    expect(commentSchema.safeParse({ content: "x".repeat(2000) }).success).toBe(true);
    expect(commentSchema.safeParse({ content: "" }).success).toBe(false);
    expect(commentSchema.safeParse({ content: "x".repeat(2001) }).success).toBe(false);
  });
  it("validates profiles with optional fields", () => {
    expect(profileSchema.safeParse({ name: "Reader" }).success).toBe(true);
    expect(profileSchema.safeParse({ name: "" }).success).toBe(false);
    expect(profileSchema.safeParse({ name: "Reader", image: "bad" }).success).toBe(false);
  });
});
