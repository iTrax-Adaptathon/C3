import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { flights } from "./flights.js";
import { tstzrange } from "./custom-types.js";

export const assignments = pgTable(
  "assignments",
  {
    id: text("id").primaryKey(),
    resourceId: text("resource_id").notNull(),
    resourceType: text("resource_type").notNull(), // 'gate' | 'crew'
    flightId: text("flight_id")
      .notNull()
      .references(() => flights.id),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    timeRange: tstzrange("time_range"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("idx_assignments_resource").on(table.resourceId, table.resourceType),
    index("idx_assignments_flight").on(table.flightId)
  ]
);
