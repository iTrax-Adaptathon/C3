import type {
  Assignment,
  BaggageRoute,
  Flight,
  Gate,
  ImpactEvent,
  ResourceType,
  SimulationResult
} from "@c3/shared";
import { addMinutes, doIntervalsOverlap } from "./intervals.js";
import { assertNoDoubleBooking, findResourceConflicts } from "./conflicts.js";
import {
  findAvailableCrew,
  findAvailableGate,
  updateBaggageRouteForNewGate
} from "./allocator.js";
import type { EngineState, ResolutionPlan, SimulationOptions } from "./types.js";
import { AirportOperationsGraph } from "./graph.js";

interface QueueItem {
  flightId: string;
  resourceType: ResourceType;
  triggerReason: string;
  depth: number;
}

export class OperationsEngine {
  /**
   * Simulates a flight delay and calculates the downstream knock-on effects across
   * gates, crews, and baggage routes. Pure dry-run: input state is NEVER modified.
   */
  public simulateDelay(
    state: EngineState,
    request: { flightId: string; delayMinutes: number; reason?: string },
    options: SimulationOptions = {}
  ): SimulationResult {
    const startTime = Date.now();
    const rootFlight = state.flights.find((f) => f.id === request.flightId);
    if (!rootFlight) {
      throw new Error(`Flight not found: ${request.flightId}`);
    }

    // Clone state deeply to ensure dry-run purity
    const tentativeFlights: Flight[] = state.flights.map((f) => ({ ...f }));
    const tentativeAssignments: Assignment[] = state.assignments.map((a) => ({
      ...a,
      startTime: new Date(a.startTime),
      endTime: new Date(a.endTime)
    }));
    let tentativeBaggage: BaggageRoute[] = state.baggageRoutes.map((b) => ({
      ...b
    }));

    const impactEvents: ImpactEvent[] = [];
    let hasUnresolvable = false;
    let unresolvableReason: string | null = null;

    // 1. Update root flight estimated times
    const delayedFlightIndex = tentativeFlights.findIndex(
      (f) => f.id === rootFlight.id
    );
    const originalFlight = tentativeFlights[delayedFlightIndex];
    const newEstArrival = addMinutes(
      originalFlight.estimatedArrival,
      request.delayMinutes
    );
    const newEstDeparture = addMinutes(
      originalFlight.estimatedDeparture,
      request.delayMinutes
    );

    tentativeFlights[delayedFlightIndex] = {
      ...originalFlight,
      estimatedArrival: newEstArrival,
      estimatedDeparture: newEstDeparture,
      status: "delayed"
    };

    // 2. Extend root flight's assignments to reflect the delayed time window
    const rootGateAssignment = tentativeAssignments.find(
      (a) => a.flightId === rootFlight.id && a.resourceType === "gate"
    );
    const rootCrewAssignment = tentativeAssignments.find(
      (a) => a.flightId === rootFlight.id && a.resourceType === "crew"
    );

    const queue: QueueItem[] = [];
    const visited = new Set<string>(); // flightId:resourceType
    const maxDepth = options.maxPropagationDepth || 10;

    if (rootGateAssignment) {
      rootGateAssignment.endTime = newEstDeparture;
      // Identify any other flights at this gate that now conflict with the extended root flight
      const gateConflicts = findResourceConflicts(
        rootGateAssignment.resourceId,
        "gate",
        { startTime: rootGateAssignment.startTime, endTime: rootGateAssignment.endTime },
        tentativeAssignments,
        rootGateAssignment.id
      );

      for (const conflict of gateConflicts) {
        queue.push({
          flightId: conflict.flightId,
          resourceType: "gate",
          triggerReason: `Bumping flight ${conflict.flightId} because flight ${rootFlight.flightNumber} delayed departure extended to ${newEstDeparture.toISOString().slice(11, 16)}Z`,
          depth: 1
        });
      }
    }

    if (rootCrewAssignment) {
      rootCrewAssignment.endTime = newEstDeparture;
      const crewConflicts = findResourceConflicts(
        rootCrewAssignment.resourceId,
        "crew",
        { startTime: rootCrewAssignment.startTime, endTime: rootCrewAssignment.endTime },
        tentativeAssignments,
        rootCrewAssignment.id
      );

      for (const conflict of crewConflicts) {
        queue.push({
          flightId: conflict.flightId,
          resourceType: "crew",
          triggerReason: `Reassigning crew for flight ${conflict.flightId} because crew is held by delayed flight ${rootFlight.flightNumber}`,
          depth: 1
        });
      }
    }

    // 3. BFS Outward Propagation with cycle safety
    while (queue.length > 0) {
      const item = queue.shift()!;
      const visitKey = `${item.flightId}:${item.resourceType}`;

      if (visited.has(visitKey)) {
        continue; // Cycle prevention
      }
      visited.add(visitKey);

      if (item.depth > maxDepth) {
        hasUnresolvable = true;
        unresolvableReason = `Propagation depth limit (${maxDepth}) exceeded. Potential cascade loop.`;
        break;
      }

      const affectedFlight = tentativeFlights.find((f) => f.id === item.flightId);
      if (!affectedFlight) continue;

      if (item.resourceType === "gate") {
        const currentAssignIdx = tentativeAssignments.findIndex(
          (a) => a.flightId === item.flightId && a.resourceType === "gate"
        );
        const currentAssign = tentativeAssignments[currentAssignIdx];
        if (!currentAssign) continue;

        const oldGateId = currentAssign.resourceId;
        const flightWindow = {
          startTime: currentAssign.startTime,
          endTime: currentAssign.endTime
        };

        // Find an alternative compatible gate that doesn't conflict with any other tentative assignment
        // Exclude the current gate since it's conflicting
        const newGate = findAvailableGate(
          affectedFlight,
          flightWindow,
          state.gates,
          tentativeAssignments.filter((a) => a.id !== currentAssign.id),
          { preferredTerminal: options.preferredTerminal, excludeGateIds: [oldGateId] }
        );

        if (!newGate) {
          hasUnresolvable = true;
          unresolvableReason = `Airport capacity saturated: No compatible gate available for flight ${affectedFlight.flightNumber} during ${flightWindow.startTime.toISOString().slice(11, 16)} - ${flightWindow.endTime.toISOString().slice(11, 16)}Z`;
          break;
        }

        // Apply reassignment
        currentAssign.resourceId = newGate.id;
        affectedFlight.gateId = newGate.id;

        // Record gate impact event
        impactEvents.push({
          id: `imp_gate_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          rootFlightId: rootFlight.id,
          affectedFlightId: affectedFlight.id,
          resourceType: "gate",
          oldResourceId: oldGateId,
          newResourceId: newGate.id,
          reason: item.triggerReason,
          timestamp: new Date()
        });

        // Update baggage route
        tentativeBaggage = updateBaggageRouteForNewGate(
          affectedFlight.id,
          newGate.id,
          tentativeBaggage
        );

        impactEvents.push({
          id: `imp_bag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          rootFlightId: rootFlight.id,
          affectedFlightId: affectedFlight.id,
          resourceType: "baggage",
          oldResourceId: oldGateId,
          newResourceId: newGate.id,
          reason: `Baggage route redirected from ${oldGateId} to ${newGate.name} for flight ${affectedFlight.flightNumber}`,
          timestamp: new Date()
        });

        // Check if newGate now conflicts with any subsequent flight that hadn't been visited yet
        const secondaryConflicts = findResourceConflicts(
          newGate.id,
          "gate",
          flightWindow,
          tentativeAssignments,
          currentAssign.id
        );

        for (const secondary of secondaryConflicts) {
          queue.push({
            flightId: secondary.flightId,
            resourceType: "gate",
            triggerReason: `Cascading displacement: flight ${affectedFlight.flightNumber} moved to ${newGate.name} and bumped flight ${secondary.flightId}`,
            depth: item.depth + 1
          });
        }
      } else if (item.resourceType === "crew") {
        const currentAssignIdx = tentativeAssignments.findIndex(
          (a) => a.flightId === item.flightId && a.resourceType === "crew"
        );
        const currentAssign = tentativeAssignments[currentAssignIdx];
        if (!currentAssign) continue;

        const oldCrewId = currentAssign.resourceId;
        const flightWindow = {
          startTime: currentAssign.startTime,
          endTime: currentAssign.endTime
        };

        const newCrew = findAvailableCrew(
          affectedFlight,
          flightWindow,
          state.crews,
          tentativeAssignments.filter((a) => a.id !== currentAssign.id),
          { preferredTerminal: options.preferredTerminal, excludeCrewIds: [oldCrewId] }
        );

        if (!newCrew) {
          hasUnresolvable = true;
          unresolvableReason = `Crew shortage: No qualified crew available for flight ${affectedFlight.flightNumber} (${affectedFlight.aircraftType})`;
          break;
        }

        currentAssign.resourceId = newCrew.id;
        affectedFlight.crewId = newCrew.id;

        impactEvents.push({
          id: `imp_crew_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          rootFlightId: rootFlight.id,
          affectedFlightId: affectedFlight.id,
          resourceType: "crew",
          oldResourceId: oldCrewId,
          newResourceId: newCrew.id,
          reason: item.triggerReason,
          timestamp: new Date()
        });

        const secondaryConflicts = findResourceConflicts(
          newCrew.id,
          "crew",
          flightWindow,
          tentativeAssignments,
          currentAssign.id
        );

        for (const secondary of secondaryConflicts) {
          queue.push({
            flightId: secondary.flightId,
            resourceType: "crew",
            triggerReason: `Cascading crew shift: crew assigned to ${affectedFlight.flightNumber} bumped flight ${secondary.flightId}`,
            depth: item.depth + 1
          });
        }
      }
    }

    // 4. Invariant Verification: if resolved without hard error, assert no double bookings
    if (!hasUnresolvable) {
      assertNoDoubleBooking(tentativeAssignments);
    }

    const changeSetToken = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const resolutionLatencyMs = Date.now() - startTime;

    return {
      changeSetToken,
      rootFlightId: rootFlight.id,
      delayMinutes: request.delayMinutes,
      impactEvents,
      proposedAssignments: tentativeAssignments,
      proposedFlights: tentativeFlights,
      proposedBaggageRoutes: tentativeBaggage,
      hasUnresolvableConflicts: hasUnresolvable,
      unresolvableReason,
      propagationDepth: impactEvents.length,
      resolutionLatencyMs,
      createdAt: new Date()
    };
  }

  /**
   * Generates a dependency graph for external introspection or visual rendering.
   */
  public getOperationsGraph(state: EngineState): AirportOperationsGraph {
    return new AirportOperationsGraph(state);
  }
}
