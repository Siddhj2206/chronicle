import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { getSession, put } = vi.hoisted(() => ({
  getSession: vi.fn(),
  put: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  getAuth: async () => ({ api: { getSession } }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({ env: { R2: { put } } }),
}));

import { POST } from "@/app/api/upload/route";

function request(file?: File) {
  const body = new FormData();
  if (file) body.set("file", file);
  return new Request("http://localhost/api/upload", {
    method: "POST",
    body,
    headers: { "content-length": "500" },
  });
}
const png = () =>
  new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])],
    "image.png",
    { type: "image/png" },
  );

beforeEach(() => {
  getSession.mockResolvedValue({ user: { id: crypto.randomUUID() } });
  put.mockReset().mockResolvedValue({});
  vi.stubEnv("NEXT_PUBLIC_R2_DOMAIN", "media.example.com");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("uploads validated image bytes with native metadata and a public URL", async () => {
  const response = await POST(request(png()));
  expect(response.status).toBe(200);
  const { key, url } = await response.json();
  expect(key).toMatch(/^uploads\/.+\/.+\.png$/);
  expect(url).toBe(`https://media.example.com/${key}`);
  expect(put).toHaveBeenCalledWith(key, expect.any(Uint8Array), {
    httpMetadata: {
      contentType: "image/png",
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
});

it("rejects signed-out uploads without storing bytes", async () => {
  getSession.mockResolvedValueOnce(null);
  expect((await POST(request(png()))).status).toBe(401);
  expect(put).not.toHaveBeenCalled();
});

it("rejects missing, empty, and invalid images without storing bytes", async () => {
  for (const file of [
    undefined,
    new File([], "empty.png", { type: "image/png" }),
    new File(["not an image"], "invalid.png", { type: "image/png" }),
  ]) {
    expect((await POST(request(file))).status).toBe(400);
  }
  expect(put).not.toHaveBeenCalled();
});

it("returns the existing upload error when the binding fails", async () => {
  put.mockRejectedValueOnce(new Error("Storage unavailable"));
  const response = await POST(request(png()));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Failed to upload file" });
});
