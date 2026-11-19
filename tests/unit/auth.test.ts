import { describe, expect, it, vi } from "vitest";

const { getDb, adapter, betterAuth } = vi.hoisted(() => ({
  getDb: vi.fn(),
  adapter: vi.fn((db: unknown) => db),
  betterAuth: vi.fn((options: unknown) => options),
}));

vi.mock("@/lib/db", () => ({ getDb }));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: adapter }));
vi.mock("better-auth", () => ({ betterAuth }));

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
});
