import { cache } from "react";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";

import * as schema from "./schema";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

type Database = NodePgDatabase<typeof schema> & { $client: Client | Pool };

let nodeDb: Database | undefined;

export const getDb = cache(async (): Promise<Database> => {
  const isWorker = globalThis.navigator?.userAgent === "Cloudflare-Workers";
  let context;
  if (process.env.NEXT_PHASE === "phase-production-build") {
    context = await getCloudflareContext({ async: true });
  } else {
    try {
      context = getCloudflareContext();
    } catch (error) {
      if (isWorker) throw error;
    }
  }

  const hyperdrive = (
    context?.env as { HYPERDRIVE?: { connectionString: string } } | undefined
  )?.HYPERDRIVE;
  if (isWorker) {
    if (!hyperdrive) throw new Error("Missing HYPERDRIVE binding");
    const client = new Client({
      connectionString: hyperdrive.connectionString,
    });
    await client.connect();
    return drizzle(client, { schema });
  }

  const connectionString =
    process.env.DATABASE_URL ?? hyperdrive?.connectionString;
  if (!connectionString) throw new Error("Missing DATABASE_URL");
  if (!nodeDb) {
    const pool = new Pool({ connectionString });
    pool.on("error", (error) =>
      console.error("Unexpected idle database client error:", error),
    );
    nodeDb = drizzle(pool, { schema });
  }
  return nodeDb;
});
