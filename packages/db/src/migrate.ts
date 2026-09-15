import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  try {
    const migrationSqlPath = path.resolve(__dirname, "./migrations/0001_init_constraints.sql");
    const sql = fs.readFileSync(migrationSqlPath, "utf-8");
    await client.query(sql);
  } finally {
    client.release();
    await pool.end();
  }
}
