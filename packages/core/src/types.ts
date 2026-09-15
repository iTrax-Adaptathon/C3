import type {
  Assignment,
  BaggageRoute,
  Crew,
  Flight,
  Gate,
  ImpactEvent,
  SimulationResult
} from "@c3/shared";

export interface EngineState {
  flights: Flight[];
  gates: Gate[];
  crews: Crew[];
  baggageRoutes: BaggageRoute[];
  assignments: Assignment[];
  recentImpactEvents?: ImpactEvent[];
}

export interface TimeInterval {
  startTime: Date;
  endTime: Date;
}

export interface ResourceConflict {
  conflictingAssignment: Assignment;
  conflictType: "overlap";
  overlapStart: Date;
  overlapEnd: Date;
}

export interface SimulationOptions {
  preferredTerminal?: string;
  allowCascadingReassignments?: boolean;
  maxPropagationDepth?: number;
}

export interface ResolutionPlan {
  changeSetToken: string;
  rootFlightId: string;
  delayMinutes: number;
  impactEvents: ImpactEvent[];
  updatedAssignments: Assignment[];
  updatedFlights: Flight[];
  updatedBaggageRoutes: BaggageRoute[];
  hasUnresolvableConflicts: boolean;
  unresolvableReason?: string | null;
}

export interface PersistenceAdapter {
  getState(): Promise<EngineState>;
  commitPlan(plan: ResolutionPlan): Promise<{ success: boolean; committedAt: Date }>;
}
