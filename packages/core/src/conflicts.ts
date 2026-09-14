import type { Assignment, ResourceType } from "@c3/shared";
import { doIntervalsOverlap } from "./intervals.js";
import type { TimeInterval } from "./types.js";

export interface ConflictingPair {
  assignmentA: Assignment;
  assignmentB: Assignment;
  resourceId: string;
  resourceType: ResourceType;
  overlapMinutes: number;
}

/**
 * Searches assignments for any that overlap with the specified window on the given resource.
 */
export function findResourceConflicts(
  resourceId: string,
  resourceType: ResourceType,
  window: TimeInterval,
  assignments: Assignment[],
  excludeAssignmentId?: string
): Assignment[] {
  return assignments.filter((a) => {
    if (a.resourceId !== resourceId || a.resourceType !== resourceType) {
      return false;
    }
    if (excludeAssignmentId && a.id === excludeAssignmentId) {
      return false;
    }
    return doIntervalsOverlap(a.startTime, a.endTime, window.startTime, window.endTime);
  });
}

/**
 * Audits the given assignments array to verify the invariant:
 * No two assignments on the same resource overlap in time.
 */
export function auditDoubleBookings(assignments: Assignment[]): ConflictingPair[] {
  const byResource = new Map<string, Assignment[]>();

  for (const a of assignments) {
    const key = `${a.resourceType}:${a.resourceId}`;
    const list = byResource.get(key) || [];
    list.push(a);
    byResource.set(key, list);
  }

  const conflicts: ConflictingPair[] = [];

  for (const [, list] of byResource.entries()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (doIntervalsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
          const maxStart = Math.max(
            new Date(a.startTime).getTime(),
            new Date(b.startTime).getTime()
          );
          const minEnd = Math.min(
            new Date(a.endTime).getTime(),
            new Date(b.endTime).getTime()
          );
          conflicts.push({
            assignmentA: a,
            assignmentB: b,
            resourceId: a.resourceId,
            resourceType: a.resourceType,
            overlapMinutes: Math.round((minEnd - maxStart) / (1000 * 60))
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Asserts the hard invariant that no double bookings exist.
 * Throws an Error if an invariant violation is found.
 */
export function assertNoDoubleBooking(assignments: Assignment[]): void {
  const violations = auditDoubleBookings(assignments);
  if (violations.length > 0) {
    const first = violations[0];
    throw new Error(
      `HARD INVARIANT VIOLATION: Resource ${first.resourceType} '${first.resourceId}' ` +
        `is double-booked between flight '${first.assignmentA.flightId}' and flight '${first.assignmentB.flightId}' ` +
        `by ${first.overlapMinutes} minutes.`
    );
  }
}
