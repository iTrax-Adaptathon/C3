import type {
  Assignment,
  BaggageRoute,
  Crew,
  Flight,
  Gate
} from "@c3/shared";
import { doIntervalsOverlap } from "./intervals.js";
import type { TimeInterval } from "./types.js";

export interface GateSearchOptions {
  preferredTerminal?: string;
  excludeGateIds?: string[];
}

export interface CrewSearchOptions {
  preferredTerminal?: string;
  excludeCrewIds?: string[];
}

/**
 * Searches for a compatible, non-conflicting gate for the flight and target window.
 * Returns the best candidate according to terminal proximity heuristics.
 */
export function findAvailableGate(
  flight: Flight,
  window: TimeInterval,
  gates: Gate[],
  tentativeAssignments: Assignment[],
  options: GateSearchOptions = {}
): Gate | null {
  const excludeSet = new Set(options.excludeGateIds || []);

  const candidates = gates.filter((gate) => {
    if (excludeSet.has(gate.id)) return false;
    if (gate.status === "maintenance") return false;

    // Must be compatible with the aircraft type
    if (!gate.compatibleAircraft.includes(flight.aircraftType)) {
      return false;
    }

    // Must have zero overlapping assignments in the tentative pool
    const hasConflict = tentativeAssignments.some((a) => {
      if (a.resourceType !== "gate" || a.resourceId !== gate.id) return false;
      return doIntervalsOverlap(a.startTime, a.endTime, window.startTime, window.endTime);
    });

    return !hasConflict;
  });

  if (candidates.length === 0) return null;

  // Score candidate gates: same terminal preferred
  const preferredTerm = options.preferredTerminal || "T1";
  candidates.sort((a, b) => {
    const aSameTerm = a.terminal === preferredTerm ? 0 : 1;
    const bSameTerm = b.terminal === preferredTerm ? 0 : 1;
    if (aSameTerm !== bSameTerm) return aSameTerm - bSameTerm;
    return a.name.localeCompare(b.name);
  });

  return candidates[0];
}

/**
 * Searches for a qualified, available crew for the flight and target window.
 */
export function findAvailableCrew(
  flight: Flight,
  window: TimeInterval,
  crews: Crew[],
  tentativeAssignments: Assignment[],
  options: CrewSearchOptions = {}
): Crew | null {
  const excludeSet = new Set(options.excludeCrewIds || []);

  const candidates = crews.filter((crew) => {
    if (excludeSet.has(crew.id)) return false;
    if (crew.status === "rest") return false;

    // Must be qualified for the aircraft type
    if (!crew.qualifications.includes(flight.aircraftType)) {
      return false;
    }

    // Must have zero overlapping assignments in the tentative pool
    const hasConflict = tentativeAssignments.some((a) => {
      if (a.resourceType !== "crew" || a.resourceId !== crew.id) return false;
      return doIntervalsOverlap(a.startTime, a.endTime, window.startTime, window.endTime);
    });

    return !hasConflict;
  });

  if (candidates.length === 0) return null;

  const preferredTerm = options.preferredTerminal || "T1";
  candidates.sort((a, b) => {
    const aSameTerm = a.currentTerminal === preferredTerm ? 0 : 1;
    const bSameTerm = b.currentTerminal === preferredTerm ? 0 : 1;
    if (aSameTerm !== bSameTerm) return aSameTerm - bSameTerm;
    return a.name.localeCompare(b.name);
  });

  return candidates[0];
}

/**
 * Recomputes baggage routing when a flight changes gates.
 */
export function updateBaggageRouteForNewGate(
  flightId: string,
  newGateId: string,
  currentBaggageRoutes: BaggageRoute[]
): BaggageRoute[] {
  return currentBaggageRoutes.map((route) => {
    if (route.flightId === flightId) {
      return {
        ...route,
        sourceGateId: newGateId,
        status: "transferring",
        updatedAt: new Date()
      };
    }
    return route;
  });
}
