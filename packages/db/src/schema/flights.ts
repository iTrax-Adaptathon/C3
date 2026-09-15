import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { gates } from "./gates.js";
import { crews } from "./crews.js";

export const flights = pgTable("flights", {
  id: text("id").primaryKey(),
  flightNumber: text("flight_number").notNull(),
  aircraftType: text("aircraft_type").notNull(),
  scheduledArrival: timestamp("scheduled_arrival", { withTimezone: true }).notNull(),
  estimatedArrival: timestamp("estimated_arrival", { withTimezone: true }).notNull(),
  scheduledDeparture: timestamp("scheduled_departure", { withTimezone: true }).notNull(),
  estimatedDeparture: timestamp("estimated_departure", { withTimezone: true }).notNull(),
  actualDeparture: timestamp("actual_departure", { withTimezone: true }),
  status: text("status").notNull().default("scheduled"),
  gateId: text("gate_id").references(() => gates.id),
  crewId: text("crew_id").references(() => crews.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
