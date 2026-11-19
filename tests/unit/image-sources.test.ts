import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function sources(domain: string) {
  vi.stubEnv("NEXT_PUBLIC_R2_DOMAIN", domain);
  vi.resetModules();
  return import("@/lib/image-sources");
}

it.each([
  "media.example.com",
  "https://media.example.com/",
  "http://media.example.com",
])("allows the configured R2 HTTPS origin from %s", async (domain) => {
  const { imageRemotePatterns, isAllowedImageUrl } = await sources(domain);
  expect(imageRemotePatterns).toContainEqual({
    protocol: "https",
    hostname: "media.example.com",
    port: "",
  });
  expect(isAllowedImageUrl("https://media.example.com/uploads/cover.png")).toBe(
    true,
  );
  for (const url of [
    "http://media.example.com/cover.png",
    "https://sub.media.example.com/cover.png",
    "https://media.example.com.evil.test/cover.png",
    "https://user:password@media.example.com/cover.png",
    "https://media.example.com:8443/cover.png",
  ])
    expect(isAllowedImageUrl(url)).toBe(false);
});

it.each(["8443", "80"])(
  "preserves an explicitly configured R2 port %s",
  async (port) => {
    const { isAllowedImageUrl } = await sources(
      `http://media.example.com:${port}/`,
    );
    expect(
      isAllowedImageUrl(`https://media.example.com:${port}/cover.png`),
    ).toBe(true);
    expect(isAllowedImageUrl("https://media.example.com/cover.png")).toBe(
      false,
    );
  },
);

it.each([
  "",
  "not a domain",
  "ftp://media.example.com",
  "https://*.example.com",
  "https://user:password@media.example.com",
])(
  "keeps the existing allowlist for an absent/invalid domain %s",
  async (domain) => {
    const { imageRemotePatterns, isAllowedImageUrl } = await sources(domain);
    expect(imageRemotePatterns).toHaveLength(4);
    for (const host of [
      "images.unsplash.com",
      "lh3.googleusercontent.com",
      "bucket.r2.cloudflarestorage.com",
      "bucket.r2.dev",
    ]) {
      expect(isAllowedImageUrl(`https://${host}/image.png`)).toBe(true);
    }
    expect(isAllowedImageUrl("https://untrusted.example.com/image.png")).toBe(
      false,
    );
    expect(isAllowedImageUrl("not a URL")).toBe(false);
  },
);

it("accepts the same custom R2 images in post and profile validation", async () => {
  await sources("media.example.com");
  const { postSchema, profileSchema } = await import("@/lib/validators");
  const url = "https://media.example.com/uploads/image.png";
  expect(
    postSchema.safeParse({ title: "Title", content: "Body", coverImage: url })
      .success,
  ).toBe(true);
  expect(profileSchema.safeParse({ name: "Writer", image: url }).success).toBe(
    true,
  );
});
