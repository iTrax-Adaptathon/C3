import { z } from "zod";

export const AircraftTypeSchema = z.enum([
  "A320",
  "A321",
  "A350",
  "A380",
  "B737",
  "B777",
  "B787",
  "CRJ900",
  "E190"
]);
export type AircraftType = z.infer<typeof AircraftTypeSchema>;

export const FlightStatusSchema = z.enum([
  "scheduled",
  "delayed",
  "boarding",
  "departed"
]);
export type FlightStatus = z.infer<typeof FlightStatusSchema>;

export const ResourceTypeSchema = z.enum(["gate", "crew"]);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

export const BaggageStatusSchema = z.enum([
  "routed",
  "transferring",
  "delayed",
  "delivered"
]);
export type BaggageStatus = z.infer<typeof BaggageStatusSchema>;

// Gate Entity
export const GateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  terminal: z.string().min(1),
  compatibleAircraft: z.array(AircraftTypeSchema),
  currentOccupancyStart: z.coerce.date().nullable().optional(),
  currentOccupancyEnd: z.coerce.date().nullable().optional(),
  status: z.enum(["available", "occupied", "maintenance"]).default("available")
});
export type Gate = z.infer<typeof GateSchema>;

// Crew Entity
export const CrewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  qualifications: z.array(AircraftTypeSchema),
  currentTerminal: z.string().min(1),
  shiftStart: z.coerce.date().optional(),
  shiftEnd: z.coerce.date().optional(),
  status: z.enum(["available", "assigned", "rest"]).default("available")
});
export type Crew = z.infer<typeof CrewSchema>;

// Flight Entity
export const FlightSchema = z.object({
  id: z.string().min(1),
  flightNumber: z.string().min(1),
  aircraftType: AircraftTypeSchema,
  scheduledArrival: z.coerce.date(),
  estimatedArrival: z.coerce.date(),
  scheduledDeparture: z.coerce.date(),
  estimatedDeparture: z.coerce.date(),
  actualDeparture: z.coerce.date().nullable().optional(),
  status: FlightStatusSchema.default("scheduled"),
  gateId: z.string().nullable().optional(),
  crewId: z.string().nullable().optional()
});
export type Flight = z.infer<typeof FlightSchema>;

// Baggage Route Entity
export const BaggageRouteSchema = z.object({
  id: z.string().min(1),
  flightId: z.string().min(1),
  sourceGateId: z.string().min(1),
  destinationCarousel: z.string().min(1),
  status: BaggageStatusSchema.default("routed"),
  updatedAt: z.coerce.date().optional()
});
export type BaggageRoute = z.infer<typeof BaggageRouteSchema>;

// Assignment Entity - Maps to table with PostgreSQL Exclusion Constraint
export const AssignmentSchema = z.object({
  id: z.string().min(1),
  resourceId: z.string().min(1),
  resourceType: ResourceTypeSchema,
  flightId: z.string().min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date()
});
export type Assignment = z.infer<typeof AssignmentSchema>;

// Impact Event Entity
export const ImpactEventSchema = z.object({
  id: z.string().min(1),
  rootFlightId: z.string().min(1),
  affectedFlightId: z.string().min(1),
  resourceType: z.enum(["gate", "crew", "baggage"]),
  oldResourceId: z.string().nullable(),
  newResourceId: z.string().nullable(),
  reason: z.string(),
  timestamp: z.coerce.date()
});
export type ImpactEvent = z.infer<typeof ImpactEventSchema>;
