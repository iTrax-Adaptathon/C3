import { relations } from "drizzle-orm";
import { flights } from "./flights.js";
import { gates } from "./gates.js";
import { crews } from "./crews.js";
import { baggageRoutes } from "./baggage.js";
import { assignments } from "./assignments.js";

export const flightsRelations = relations(flights, ({ one, many }) => ({
  gate: one(gates, {
    fields: [flights.gateId],
    references: [gates.id]
  }),
  crew: one(crews, {
    fields: [flights.crewId],
    references: [crews.id]
  }),
  baggageRoutes: many(baggageRoutes),
  assignments: many(assignments)
}));

export const gatesRelations = relations(gates, ({ many }) => ({
  flights: many(flights)
}));

export const crewsRelations = relations(crews, ({ many }) => ({
  flights: many(flights)
}));

export const baggageRoutesRelations = relations(baggageRoutes, ({ one }) => ({
  flight: one(flights, {
    fields: [baggageRoutes.flightId],
    references: [flights.id]
  }),
  sourceGate: one(gates, {
    fields: [baggageRoutes.sourceGateId],
    references: [gates.id]
  })
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  flight: one(flights, {
    fields: [assignments.flightId],
    references: [flights.id]
  })
}));
