import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: ".env.test", quiet: true });

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/{unit,integration}/**/*.test.ts"],
    setupFiles: ["./tests/helpers/setup.ts"],
    fileParallelism: false,
  },
});
