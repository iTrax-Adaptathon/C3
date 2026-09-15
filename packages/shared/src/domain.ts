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

// Passenger Entity
export const PassengerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phoneNumber: z.string().min(1),
  flightId: z.string().min(1),
  seatNumber: z.string().min(1),
  bookingReference: z.string().min(1),
  connectingFlightId: z.string().nullable().optional(),
  secureToken: z.string().min(1)
});
export type Passenger = z.infer<typeof PassengerSchema>;

// Notification Status
export const NotificationStatusSchema = z.enum([
  "PENDING",
  "SENT",
  "DELIVERED",
  "FAILED"
]);
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

// Flight Change Diff
export const FlightChangeDiffSchema = z.object({
  flightId: z.string(),
  flightNumber: z.string(),
  departureChanged: z.boolean(),
  terminalChanged: z.boolean(),
  gateChanged: z.boolean(),
  baggageChanged: z.boolean(),
  statusChanged: z.boolean(),
  oldDeparture: z.coerce.date().optional(),
  newDeparture: z.coerce.date().optional(),
  delayMinutes: z.number().optional(),
  oldTerminal: z.string().optional(),
  newTerminal: z.string().optional(),
  transferTimeMinutes: z.number().optional(),
  oldGate: z.string().optional(),
  newGate: z.string().optional(),
  oldBaggage: z.string().optional(),
  newBaggage: z.string().optional(),
  oldStatus: FlightStatusSchema.optional(),
  newStatus: FlightStatusSchema.optional()
});
export type FlightChangeDiff = z.infer<typeof FlightChangeDiffSchema>;

// Passenger Notification Entity
export const PassengerNotificationSchema = z.object({
  id: z.string().min(1),
  changeSetToken: z.string().min(1),
  passengerId: z.string().min(1),
  passengerName: z.string().min(1),
  passengerPhone: z.string().min(1),
  flightId: z.string().min(1),
  flightNumber: z.string().min(1),
  changes: FlightChangeDiffSchema,
  messageBody: z.string().min(1),
  status: NotificationStatusSchema,
  failureReason: z.string().optional(),
  secureToken: z.string().min(1),
  sentAt: z.coerce.date().optional(),
  deliveredAt: z.coerce.date().optional(),
  createdAt: z.coerce.date()
});
export type PassengerNotification = z.infer<typeof PassengerNotificationSchema>;

