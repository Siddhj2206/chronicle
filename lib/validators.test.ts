import assert from "node:assert/strict";
import { test } from "node:test";

import { imageUrlSchema, postSchema, profileSchema } from "@/lib/validators";

test("accepts configured HTTPS image sources for avatars and covers", () => {
  for (const image of [
    "https://images.unsplash.com/photo?id=1",
    "https://lh3.googleusercontent.com/avatar",
    "https://account.r2.cloudflarestorage.com/bucket/image.png",
    "https://public.r2.dev/uploads/image.png",
  ]) {
    assert.equal(imageUrlSchema.safeParse(image).success, true);
    assert.equal(
      profileSchema.safeParse({ name: "Author", image }).success,
      true,
    );
    assert.equal(
      postSchema.safeParse({
        title: "Post",
        content: "Body",
        coverImage: image,
      }).success,
      true,
    );
  }
});

test("rejects malformed, unconfigured and spoofed image sources", () => {
  for (const image of [
    "not a URL",
    "https://example.com/image.png",
    "javascript:alert(1)",
    "http://lh3.googleusercontent.com/avatar",
    "https://lh3.googleusercontent.com:8443/avatar",
    "https://lh3.googleusercontent.com.evil.com/avatar",
    "https://evilr2.dev/image",
    "https://public.r2.dev.evil.com/image",
    "https://user:pass@public.r2.dev/image",
    "data:image/png;base64,aGVsbG8=",
    "/uploads/image.png",
  ]) {
    assert.equal(imageUrlSchema.safeParse(image).success, false);
    assert.equal(
      profileSchema.safeParse({ name: "Author", image }).success,
      false,
    );
    assert.equal(
      postSchema.safeParse({
        title: "Post",
        content: "Body",
        coverImage: image,
      }).success,
      false,
    );
  }
});

test("optional profile and cover images can be empty; avatar updates require a URL", () => {
  for (const image of [undefined, ""]) {
    assert.equal(
      profileSchema.safeParse({ name: "Author", image }).success,
      true,
    );
    assert.equal(
      postSchema.safeParse({
        title: "Post",
        content: "Body",
        coverImage: image,
      }).success,
      true,
    );
    assert.equal(imageUrlSchema.safeParse(image).success, false);
  }
});
