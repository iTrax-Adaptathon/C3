import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const crews = pgTable("crews", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  qualifications: text("qualifications").array().notNull(),
  currentTerminal: text("current_terminal").notNull(),
  status: text("status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
