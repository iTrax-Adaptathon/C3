import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

export * from "./schema/index.js";
export * from "./migrate.js";

export type DbClient = ReturnType<typeof createDbClient>;

export function createDbClient(connectionString: string) {
  const pool = new pg.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  return {
    db: drizzle(pool, { schema }),
    pool
  };
}
