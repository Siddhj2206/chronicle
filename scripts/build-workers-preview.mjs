import { spawnSync } from "node:child_process";

import { unstable_readConfig as readConfig } from "wrangler";

const config = readConfig({ config: "wrangler.jsonc", env: "preview" });
const result = spawnSync(
  "opennextjs-cloudflare",
  ["build", "--env", "preview"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      ...config.vars,
      NEXT_DEV_WRANGLER_ENV: "preview",
    },
  },
);
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
