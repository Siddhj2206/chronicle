import { readFileSync } from "node:fs";

import { expect, it } from "vitest";

import config from "@/open-next.config";

it("uses persistent R2 and D1 caches and a deduplicating DO ISR queue", async () => {
  const overrides = config.default?.override;
  for (const [key, name] of [
    ["incrementalCache", "cf-r2-incremental-cache"],
    ["tagCache", "d1-next-mode-tag-cache"],
    ["queue", "durable-queue"],
  ] as const) {
    const override = overrides?.[key];
    if (typeof override !== "function") throw new Error(`Missing ${key}`);
    expect((await override()).name).toBe(name);
  }
  expect(config.dangerous?.enableCacheInterception).toBe(false);
  expect(overrides?.cdnInvalidation).toBe("dummy");
});

it("initializes build caches through OpenNext for preview and deployment", () => {
  const { scripts } = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  );
  for (const command of ["preview", "deploy", "upload"]) {
    expect(scripts[command]).toContain(`opennextjs-cloudflare ${command}`);
  }
  expect(scripts["cache:populate:local"]).toBe(
    "opennextjs-cloudflare populateCache local",
  );
});
