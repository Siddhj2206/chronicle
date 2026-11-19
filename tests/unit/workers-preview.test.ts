import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { afterEach, expect, it, vi } from "vitest";
import { unstable_readConfig as readConfig } from "wrangler";

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  spawnSync: vi.fn(),
}));

const originalExitCode = process.exitCode;
afterEach(() => {
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("resolves every preview binding without inheriting production routes or resources", () => {
  const preview = readConfig({ config: "wrangler.jsonc", env: "preview" });
  const production = readConfig({ config: "wrangler.jsonc", env: "" });
  expect(preview.name).toBe("chronicle-preview");
  expect(preview.workers_dev).toBe(true);
  expect(preview.preview_urls).toBe(false);
  expect(preview.routes).toEqual([]);
  expect(preview.route).toBeUndefined();
  expect(preview.assets).toEqual(production.assets);
  expect(preview.images).toEqual({ binding: "IMAGES" });
  expect(preview.services).toEqual([
    { binding: "WORKER_SELF_REFERENCE", service: "chronicle-preview" },
  ]);
  expect(preview.durable_objects.bindings).toEqual(
    production.durable_objects.bindings,
  );
  expect(preview.migrations).toEqual([
    { tag: "v1", new_sqlite_classes: ["DOQueueHandler"] },
  ]);
  expect(
    preview.r2_buckets.map(({ binding, bucket_name }) => [
      binding,
      bucket_name,
    ]),
  ).toEqual([
    ["R2", "chronicle-preview"],
    ["NEXT_INC_CACHE_R2_BUCKET", "chronicle-preview-cache"],
  ]);
  expect(preview.hyperdrive[0].binding).toBe("HYPERDRIVE");
  expect(preview.hyperdrive[0].id).not.toBe(production.hyperdrive[0].id);
  expect(preview.d1_databases[0]).toMatchObject({
    binding: "NEXT_TAG_CACHE_D1",
    database_name: "chronicle-preview-tags",
  });
  expect(preview.d1_databases[0].database_id).not.toBe(
    production.d1_databases[0].database_id,
  );
  expect(preview.vars.BETTER_AUTH_URL).toBe(preview.vars.NEXT_PUBLIC_APP_URL);
  expect(preview.vars.BETTER_AUTH_URL).toBe(
    "https://chronicle-preview.replace-with-subdomain.workers.dev",
  );
  expect(preview.build.command).toBe("");
  expect(production.build.command).toBe(
    "node scripts/check-workers-deploy.mjs",
  );
});

it.each([
  ["true", "deploy", [], "", false],
  ["true", "upload", [], "", false],
  ["true", "populateCache", ["remote"], "", false],
  ["true", "--", ["populateCache", "remote"], "", false],
  ["true", "--", ["deploy"], "", false],
  ["true", "--config", ["wrangler.jsonc", "deploy"], "", false],
  ["true", "--config=wrangler.jsonc", ["populateCache", "remote"], "", false],
  ["true", "--env", ["preview", "--", "deploy"], "", true],
  ["true", "--config", ["deploy", "build"], "", true],
  ["true", "--configPath", ["build", "--", "deploy"], "", false],
  ["true", "deploy", ["--env", "preview"], "", true],
  ["true", "deploy", ["--env=preview"], "", true],
  ["true", "deploy", ["-e", "preview"], "", true],
  ["true", "deploy", [], "preview", true],
  ["true", "deploy", ["--env="], "preview", false],
  ["true", "deploy", ["--env", "preview", "--env", ""], "", false],
  ["true", "populateCache", ["local"], "", true],
  ["true", "build", [], "", true],
  ["", "deploy", [], "", true],
  ["false", "deploy", [], "", true],
])(
  "guards CI=%s %s %j (environment=%s)",
  async (ci, command, args, environment, allowed) => {
    const { spawnSync: run } =
      await vi.importActual<typeof import("node:child_process")>(
        "node:child_process",
      );
    const result = run(
      process.execPath,
      ["scripts/check-workers-deploy.mjs", command, ...args],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          CI: ci,
          CLOUDFLARE_ENV: environment,
          WRANGLER_COMMAND: "",
        },
      },
    );
    expect(result.status).toBe(allowed ? 0 : 1);
    if (!allowed)
      expect(result.stderr).toContain(
        "Refusing default-environment deployment in CI",
      );
  },
);

it.each(["deploy", "versions upload"])(
  "guards bare Wrangler %s before bundling",
  async (command) => {
    const { spawnSync: run } =
      await vi.importActual<typeof import("node:child_process")>(
        "node:child_process",
      );
    const result = run(process.execPath, ["scripts/check-workers-deploy.mjs"], {
      env: { ...process.env, CI: "true", WRANGLER_COMMAND: command },
    });
    expect(result.status).toBe(1);
    expect(readFileSync("open-next.config.ts", "utf8")).toContain(
      'import "./scripts/check-workers-deploy.mjs"',
    );
  },
);

it.each([0, 7, null])(
  "builds with preview vars and propagates child status %s",
  async (status) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://production.example.com");
    vi.stubEnv("NEXT_DEV_WRANGLER_ENV", "");
    vi.mocked(spawnSync).mockReturnValue({ status } as ReturnType<
      typeof spawnSync
    >);
    await import("../../scripts/build-workers-preview.mjs");
    expect(spawnSync).toHaveBeenLastCalledWith(
      "opennextjs-cloudflare",
      ["build", "--env", "preview"],
      {
        stdio: "inherit",
        env: expect.objectContaining({
          NEXT_DEV_WRANGLER_ENV: "preview",
          BETTER_AUTH_URL:
            "https://chronicle-preview.replace-with-subdomain.workers.dev",
          NEXT_PUBLIC_APP_URL:
            "https://chronicle-preview.replace-with-subdomain.workers.dev",
          NEXT_PUBLIC_R2_DOMAIN: "replace-with-preview-media.example.invalid",
        }),
      },
    );
    expect(process.exitCode).toBe(status ?? 1);
  },
);

it("reports a build spawn failure and exits unsuccessfully", async () => {
  const error = new Error("build executable missing");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(spawnSync).mockReturnValue({ status: null, error } as ReturnType<
    typeof spawnSync
  >);
  await import("../../scripts/build-workers-preview.mjs");
  expect(log).toHaveBeenCalledWith(error);
  expect(process.exitCode).toBe(1);
});

it("forwards the preview environment to deploy, local preview and cache population", () => {
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  expect(scripts["preview:build"]).toBe(
    "node scripts/build-workers-preview.mjs",
  );
  for (const [name, command] of [
    ["preview:dev", "preview"],
    ["preview:deploy", "deploy"],
  ]) {
    expect(scripts[name]).toBe(
      `bun run preview:build && opennextjs-cloudflare ${command} --env preview`,
    );
  }
  for (const target of ["local", "remote"]) {
    expect(scripts[`preview:cache:${target}`]).toBe(
      `opennextjs-cloudflare populateCache ${target} --env preview`,
    );
  }
});
