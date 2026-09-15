import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { flights } from "./flights.js";
import { gates } from "./gates.js";

export const baggageRoutes = pgTable("baggage_routes", {
  id: text("id").primaryKey(),
  flightId: text("flight_id")
    .notNull()
    .references(() => flights.id),
  sourceGateId: text("source_gate_id")
    .notNull()
    .references(() => gates.id),
  destinationCarousel: text("destination_carousel").notNull(),
  status: text("status").notNull().default("routed"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
