import { z } from "zod";
import {
  AssignmentSchema,
  BaggageRouteSchema,
  CrewSchema,
  FlightSchema,
  GateSchema,
  ImpactEventSchema,
  PassengerNotificationSchema,
  PassengerSchema
} from "./domain.js";

// Request to report delay on a flight
export const DelayRequestSchema = z.object({
  delayMinutes: z.number().int().min(1).max(1440),
  reason: z.string().optional()
});
export type DelayRequest = z.infer<typeof DelayRequestSchema>;

// Generic simulation / what-if request
export const SimulationPreviewRequestSchema = z.object({
  flightId: z.string().min(1),
  delayMinutes: z.number().int().min(0).max(1440),
  targetGateId: z.string().optional(),
  targetCrewId: z.string().optional()
});
export type SimulationPreviewRequest = z.infer<typeof SimulationPreviewRequestSchema>;

// Simulation / Dry-run Result
export const SimulationResultSchema = z.object({
  changeSetToken: z.string().min(1),
  rootFlightId: z.string().min(1),
  delayMinutes: z.number().int(),
  impactEvents: z.array(ImpactEventSchema),
  proposedAssignments: z.array(AssignmentSchema),
  proposedFlights: z.array(FlightSchema),
  proposedBaggageRoutes: z.array(BaggageRouteSchema),
  hasUnresolvableConflicts: z.boolean(),
  unresolvableReason: z.string().nullable().optional(),
  propagationDepth: z.number().int().optional(),
  resolutionLatencyMs: z.number().optional(),
  createdAt: z.coerce.date()
});
export type SimulationResult = z.infer<typeof SimulationResultSchema>;

// Commit preview request
export const CommitChangeSetRequestSchema = z.object({
  changeSetToken: z.string().min(1)
});
export type CommitChangeSetRequest = z.infer<typeof CommitChangeSetRequestSchema>;

export const CommitChangeSetResponseSchema = z.object({
  success: z.boolean(),
  changeSetToken: z.string(),
  committedAt: z.coerce.date(),
  impactEventsCount: z.number(),
  updatedAssignmentsCount: z.number(),
  notificationsSentCount: z.number().optional()
});
export type CommitChangeSetResponse = z.infer<typeof CommitChangeSetResponseSchema>;

// Ops Board snapshot
export const OpsBoardStateSchema = z.object({
  flights: z.array(FlightSchema),
  gates: z.array(GateSchema),
  crews: z.array(CrewSchema),
  baggageRoutes: z.array(BaggageRouteSchema),
  assignments: z.array(AssignmentSchema),
  recentImpactEvents: z.array(ImpactEventSchema),
  lastUpdated: z.coerce.date()
});
export type OpsBoardState = z.infer<typeof OpsBoardStateSchema>;

// Notification Stats Summary
export const NotificationStatsResponseSchema = z.object({
  total: z.number(),
  delivered: z.number(),
  sent: z.number(),
  failed: z.number(),
  pending: z.number()
});
export type NotificationStatsResponse = z.infer<typeof NotificationStatsResponseSchema>;

// Retry Notification Response
export const RetryNotificationResponseSchema = z.object({
  success: z.boolean(),
  notification: PassengerNotificationSchema
});
export type RetryNotificationResponse = z.infer<typeof RetryNotificationResponseSchema>;

// Passenger Mobile Portal Response
export const PassengerPortalResponseSchema = z.object({
  passenger: PassengerSchema,
  flight: FlightSchema,
  gate: GateSchema.nullable().optional(),
  baggageRoute: BaggageRouteSchema.nullable().optional(),
  latestNotification: PassengerNotificationSchema.nullable().optional(),
  notifications: z.array(PassengerNotificationSchema),
  connectingFlight: FlightSchema.nullable().optional(),
  missedConnectionRisk: z.enum(["LOW", "MEDIUM", "HIGH", "NONE"]).optional()
});
export type PassengerPortalResponse = z.infer<typeof PassengerPortalResponseSchema>;

// Passenger Manifest View Item
export const PassengerManifestItemSchema = z.object({
  passenger: PassengerSchema,
  latestNotification: PassengerNotificationSchema.nullable().optional(),
  connectingFlightNumber: z.string().nullable().optional(),
  connectionRisk: z.enum(["LOW", "MEDIUM", "HIGH", "NONE"]).optional()
});
export type PassengerManifestItem = z.infer<typeof PassengerManifestItemSchema>;

export const PassengerManifestResponseSchema = z.object({
  flight: FlightSchema,
  passengers: z.array(PassengerManifestItemSchema),
  totalPassengers: z.number(),
  notificationsDelivered: z.number(),
  notificationsFailed: z.number(),
  missedConnectionsAtRisk: z.number()
});
export type PassengerManifestResponse = z.infer<typeof PassengerManifestResponseSchema>;

