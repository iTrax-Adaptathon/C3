import { z } from "zod";
import {
  AssignmentSchema,
  BaggageRouteSchema,
  CrewSchema,
  FlightSchema,
  GateSchema,
  ImpactEventSchema
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
  updatedAssignmentsCount: z.number()
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
