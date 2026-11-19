import { afterEach, describe, expect, it, vi } from "vitest";

const { getDb, adapter, betterAuth } = vi.hoisted(() => ({
  getDb: vi.fn(),
  adapter: vi.fn((db: unknown) => db),
  betterAuth: vi.fn((options: unknown) => options),
}));

vi.mock("@/lib/db", () => ({ getDb }));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: adapter }));
vi.mock("better-auth", () => ({ betterAuth }));

afterEach(() => vi.unstubAllEnvs());

describe("auth lifecycle", () => {
  it("constructs auth with the current request's database, not a captured instance", async () => {
    const first = { request: "first" };
    const second = { request: "second" };
    getDb.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { getAuth } = await import("@/lib/auth");
    expect(await getAuth()).not.toBe(await getAuth());
    expect(adapter.mock.calls.map(([db]) => db)).toEqual([first, second]);
    expect(betterAuth).toHaveBeenCalledTimes(2);
  });

  it("propagates database initialization failures", async () => {
    getDb.mockRejectedValueOnce(new Error("Database unavailable"));
    const { getAuth } = await import("@/lib/auth");
    await expect(getAuth()).rejects.toThrow("Database unavailable");
  });

  it.each([
    ["https://chronicle.siddhant.foo", false],
    ["http://localhost:8787", false],
    ["https://chronicle-lyart.vercel.app", true],
    ["https://chronicle-preview-team.vercel.app", true],
    ["https://vercel.app", false],
    ["https://notvercel.app", false],
    ["https://preview.vercel.app.evil.test", false],
    ["https://chronicle.siddhant.foo/?next=https://preview.vercel.app", false],
  ])(
    "uses exact trusted origins and scopes OAuth state bypass for %s",
    async (url, skip) => {
      vi.stubEnv("BETTER_AUTH_URL", url);
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://another-app.example.test");
      getDb.mockResolvedValueOnce({});
      const { getAuth } = await import("@/lib/auth");
      await getAuth();
      expect(betterAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: new URL(url).origin,
          trustedOrigins: [new URL(url).origin],
          account: { skipStateCookieCheck: skip },
        }),
      );
    },
  );

  it.each([
    [
      "https://chronicle.siddhant.foo",
      "preview.vercel.app",
      "https://chronicle.siddhant.foo",
      false,
    ],
    ["", "preview.vercel.app", "https://preview.vercel.app", true],
    ["", "", "http://localhost:3000", false],
  ])(
    "resolves missing auth URL using app URL, Vercel or localhost",
    async (appURL, vercelURL, baseURL, skip) => {
      vi.stubEnv("BETTER_AUTH_URL", "");
      vi.stubEnv("NEXT_PUBLIC_APP_URL", appURL);
      vi.stubEnv("VERCEL_URL", vercelURL);
      getDb.mockResolvedValueOnce({});
      const { getAuth } = await import("@/lib/auth");
      await getAuth();
      expect(betterAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL,
          trustedOrigins: [baseURL],
          account: { skipStateCookieCheck: skip },
        }),
      );
    },
  );

  it("fails closed for a malformed configured auth URL", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "not a URL");
    const { getAuth } = await import("@/lib/auth");
    await expect(getAuth()).rejects.toThrow(TypeError);
    expect(betterAuth).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });
});
