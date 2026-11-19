import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { context, pool, on, client, connect, drizzle } = vi.hoisted(() => ({
  context: vi.fn(),
  pool: vi.fn(function (options: unknown) {
    return { options, on };
  }),
  on: vi.fn(),
  client: vi.fn(function (options: unknown) {
    return { options, connect };
  }),
  connect: vi.fn(),
  drizzle: vi.fn((client: unknown) => ({ client })),
}));

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: context }));
vi.mock("pg", () => ({ Pool: pool, Client: client }));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv("DATABASE_URL", "postgres://node/test");
  vi.stubEnv("NEXT_PHASE", "");
  context.mockReset().mockImplementation(() => {
    throw new Error("No context");
  });
  pool.mockClear();
  on.mockClear();
  client.mockClear();
  connect.mockReset().mockResolvedValue(undefined);
  drizzle.mockClear();
});

describe("database lifecycle", () => {
  it("logs idle Node pool errors", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { getDb } = await import("@/lib/db");
      await getDb();
      const error = new Error("Idle connection lost");
      expect(on).toHaveBeenCalledWith("error", expect.any(Function));
      on.mock.calls[0][1](error);
      expect(log).toHaveBeenCalledWith(
        "Unexpected idle database client error:",
        error,
      );
    } finally {
      log.mockRestore();
    }
  });

  it("reuses one Node pool when no Cloudflare context is available", async () => {
    const { getDb } = await import("@/lib/db");
    expect(await getDb()).toBe(await getDb());
    expect(pool).toHaveBeenCalledExactlyOnceWith({
      connectionString: "postgres://node/test",
    });
  });

  it("falls back to the Node pool when a development context has no binding", async () => {
    context.mockReturnValue({ env: {} });
    const { getDb } = await import("@/lib/db");
    expect(await getDb()).toBe(await getDb());
    expect(pool).toHaveBeenCalledTimes(1);
  });

  it("never shares a Worker client outside React's request cache", async () => {
    vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" });
    context.mockReturnValue({
      env: { HYPERDRIVE: { connectionString: "postgres://hyperdrive/test" } },
    });
    const { getDb } = await import("@/lib/db");
    expect(await getDb()).not.toBe(await getDb());
    expect(client).toHaveBeenCalledTimes(2);
    expect(client).toHaveBeenCalledWith({
      connectionString: "postgres://hyperdrive/test",
    });
    expect(connect).toHaveBeenCalledTimes(2);
    expect(pool).not.toHaveBeenCalled();
  });

  it("prefers DATABASE_URL in Node even with a local development binding", async () => {
    context.mockReturnValue({
      env: { HYPERDRIVE: { connectionString: "postgres://local/test" } },
    });
    const { getDb } = await import("@/lib/db");
    expect(await getDb()).toBe(await getDb());
    expect(pool).toHaveBeenCalledExactlyOnceWith({
      connectionString: "postgres://node/test",
    });
    expect(client).not.toHaveBeenCalled();
  });

  it("propagates Worker connection failures", async () => {
    vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" });
    context.mockReturnValue({
      env: { HYPERDRIVE: { connectionString: "postgres://hyperdrive/test" } },
    });
    connect.mockRejectedValueOnce(new Error("Connection failed"));
    const { getDb } = await import("@/lib/db");
    await expect(getDb()).rejects.toThrow("Connection failed");
    expect(drizzle).not.toHaveBeenCalled();
  });

  it("uses the async context API during static generation", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    context.mockResolvedValue({
      env: { HYPERDRIVE: { connectionString: "postgres://build/test" } },
    });
    const { getDb } = await import("@/lib/db");
    await getDb();
    expect(context).toHaveBeenCalledWith({ async: true });
  });

  it("does not hide errors obtaining the static generation context", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    const { getDb } = await import("@/lib/db");
    await expect(getDb()).rejects.toThrow("No context");
    expect(pool).not.toHaveBeenCalled();
  });

  it("rejects missing Worker bindings rather than using a global pool", async () => {
    vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" });
    context.mockReturnValue({ env: {} });
    const { getDb } = await import("@/lib/db");
    await expect(getDb()).rejects.toThrow("Missing HYPERDRIVE binding");
    expect(pool).not.toHaveBeenCalled();
  });

  it("propagates missing Worker contexts", async () => {
    vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" });
    const { getDb } = await import("@/lib/db");
    await expect(getDb()).rejects.toThrow("No context");
  });

  it("rejects missing Node connection strings", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDb } = await import("@/lib/db");
    await expect(getDb()).rejects.toThrow("Missing DATABASE_URL");
    expect(pool).not.toHaveBeenCalled();
  });
});
