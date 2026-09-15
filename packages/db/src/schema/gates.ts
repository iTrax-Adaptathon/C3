import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const gates = pgTable("gates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  terminal: text("terminal").notNull(),
  compatibleAircraft: text("compatible_aircraft").array().notNull(),
  status: text("status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
