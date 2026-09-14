import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const impactEvents = pgTable(
  "impact_events",
  {
    id: text("id").primaryKey(),
    rootFlightId: text("root_flight_id").notNull(),
    affectedFlightId: text("affected_flight_id").notNull(),
    resourceType: text("resource_type").notNull(),
    oldResourceId: text("old_resource_id"),
    newResourceId: text("new_resource_id"),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("idx_impact_root_flight").on(table.rootFlightId),
    index("idx_impact_affected_flight").on(table.affectedFlightId),
    index("idx_impact_created_at").on(table.createdAt)
  ]
);
