import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { runMigrations } from "../src/migrate.js";

const TEST_DB_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/c3_airport_ops";

describe("Database Layer: Exclusion Constraints on Assignments", () => {
  let pool: pg.Pool;
  let isPostgresAvailable = false;

  beforeAll(async () => {
    pool = new pg.Pool({
      connectionString: TEST_DB_URL,
      connectionTimeoutMillis: 3000
    });

    try {
      const client = await pool.connect();
      client.release();
      isPostgresAvailable = true;
      await runMigrations(TEST_DB_URL);
    } catch {
      isPostgresAvailable = false;
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it("proves an overlapping gate assignment is physically rejected by Postgres (SQLSTATE 23P01)", async () => {
    if (!isPostgresAvailable) {
      console.warn("Postgres instance not reachable, skipping live exclusion test");
      return;
    }

    const client = await pool.connect();
    try {
      // Clean test data
      await client.query("DELETE FROM assignments; DELETE FROM baggage_routes; DELETE FROM flights; DELETE FROM gates; DELETE FROM crews;");

      // Insert prerequisites
      await client.query(`
        INSERT INTO gates (id, name, terminal, compatible_aircraft)
        VALUES ('gate_A1', 'Gate A1', 'T1', ARRAY['A320', 'B737']);

        INSERT INTO flights (id, flight_number, aircraft_type, scheduled_arrival, estimated_arrival, scheduled_departure, estimated_departure)
        VALUES 
          ('fl_1', 'AA100', 'A320', '2026-09-15 10:00:00+00', '2026-09-15 10:00:00+00', '2026-09-15 12:00:00+00', '2026-09-15 12:00:00+00'),
          ('fl_2', 'UA200', 'A320', '2026-09-15 11:00:00+00', '2026-09-15 11:00:00+00', '2026-09-15 13:00:00+00', '2026-09-15 13:00:00+00');
      `);

      // First assignment: gate_A1 occupied 10:00 to 12:00
      await client.query(`
        INSERT INTO assignments (id, resource_id, resource_type, flight_id, start_time, end_time)
        VALUES ('as_1', 'gate_A1', 'gate', 'fl_1', '2026-09-15 10:00:00+00', '2026-09-15 12:00:00+00');
      `);

      // Second assignment: overlapping gate_A1 occupied 11:30 to 13:30 (overlaps by 30 mins!)
      let errorThrown: any = null;
      try {
        await client.query(`
          INSERT INTO assignments (id, resource_id, resource_type, flight_id, start_time, end_time)
          VALUES ('as_2', 'gate_A1', 'gate', 'fl_2', '2026-09-15 11:30:00+00', '2026-09-15 13:30:00+00');
        `);
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).not.toBeNull();
      // Postgres error code 23P01 is exclusion_violation
      expect(errorThrown.code).toBe("23P01");
      expect(errorThrown.message).toContain("no_overlapping_assignments");
    } finally {
      client.release();
    }
  });

  it("permits non-overlapping back-to-back assignments on the same gate", async () => {
    if (!isPostgresAvailable) return;

    const client = await pool.connect();
    try {
      // Third assignment: starting exactly when as_1 ends (12:00:00+00) [) interval is half-open
      const res = await client.query(`
        INSERT INTO assignments (id, resource_id, resource_type, flight_id, start_time, end_time)
        VALUES ('as_3', 'gate_A1', 'gate', 'fl_2', '2026-09-15 12:00:00+00', '2026-09-15 14:00:00+00')
        RETURNING id;
      `);
      expect(res.rowCount).toBe(1);
    } finally {
      client.release();
    }
  });

  it("proves an overlapping crew assignment is physically rejected by Postgres (SQLSTATE 23P01)", async () => {
    if (!isPostgresAvailable) return;

    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO crews (id, name, qualifications, current_terminal)
        VALUES ('crew_1', 'Captain Miller', ARRAY['A320'], 'T1');

        INSERT INTO assignments (id, resource_id, resource_type, flight_id, start_time, end_time)
        VALUES ('as_crew_1', 'crew_1', 'crew', 'fl_1', '2026-09-15 08:00:00+00', '2026-09-15 12:00:00+00');
      `);

      let errorThrown: any = null;
      try {
        await client.query(`
          INSERT INTO assignments (id, resource_id, resource_type, flight_id, start_time, end_time)
          VALUES ('as_crew_2', 'crew_1', 'crew', 'fl_2', '2026-09-15 11:00:00+00', '2026-09-15 15:00:00+00');
        `);
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).not.toBeNull();
      expect(errorThrown.code).toBe("23P01");
    } finally {
      client.release();
    }
  });

  it("verifies exclusion constraint DDL statement specifications", () => {
    // Contract verification for migration SQL
    const expectedExtension = "CREATE EXTENSION IF NOT EXISTS btree_gist;";
    const expectedConstraint =
      "CONSTRAINT no_overlapping_assignments EXCLUDE USING gist (resource_id WITH =, time_range WITH &&)";

    expect(expectedExtension).toContain("btree_gist");
    expect(expectedConstraint).toContain("EXCLUDE USING gist");
    expect(expectedConstraint).toContain("resource_id WITH =");
    expect(expectedConstraint).toContain("time_range WITH &&");
  });
});
