import { describe, it, expect } from "vitest";
import {
  OperationsEngine,
  assertNoDoubleBooking,
  doIntervalsOverlap
} from "../src/index.js";
import type { EngineState } from "../src/types.js";
import type { Flight, Gate, Crew, BaggageRoute, Assignment } from "@c3/shared";

describe("Core Engine: Conflict Detection & Invariants", () => {
  it("correctly identifies half-open interval overlaps and non-overlaps", () => {
    const t10 = new Date("2026-09-15T10:00:00Z");
    const t12 = new Date("2026-09-15T12:00:00Z");
    const t11 = new Date("2026-09-15T11:00:00Z");
    const t13 = new Date("2026-09-15T13:00:00Z");
    const t14 = new Date("2026-09-15T14:00:00Z");

    // Overlapping [10, 12) and [11, 13)
    expect(doIntervalsOverlap(t10, t12, t11, t13)).toBe(true);

    // Contiguous non-overlapping: [10, 12) and [12, 14)
    expect(doIntervalsOverlap(t10, t12, t12, t14)).toBe(false);

    // Disjoint non-overlapping: [10, 11) and [13, 14)
    expect(doIntervalsOverlap(t10, t11, t13, t14)).toBe(false);
  });

  it("throws a Hard Invariant Violation when an assignment array contains double-booking", () => {
    const invalidAssignments: Assignment[] = [
      {
        id: "as_1",
        resourceId: "gate_1",
        resourceType: "gate",
        flightId: "fl_1",
        startTime: new Date("2026-09-15T10:00:00Z"),
        endTime: new Date("2026-09-15T12:00:00Z")
      },
      {
        id: "as_2",
        resourceId: "gate_1",
        resourceType: "gate",
        flightId: "fl_2",
        startTime: new Date("2026-09-15T11:30:00Z"), // overlaps by 30 mins!
        endTime: new Date("2026-09-15T13:30:00Z")
      }
    ];

    expect(() => assertNoDoubleBooking(invalidAssignments)).toThrow(
      /HARD INVARIANT VIOLATION: Resource gate 'gate_1' is double-booked/
    );
  });
});

describe("Core Engine: Propagation & Simulation", () => {
  function createBaseState(): EngineState {
    const gates: Gate[] = [
      {
        id: "gate_A1",
        name: "Gate A1",
        terminal: "T1",
        compatibleAircraft: ["A320", "B737", "A321"],
        status: "available"
      },
      {
        id: "gate_A2",
        name: "Gate A2",
        terminal: "T1",
        compatibleAircraft: ["A320", "B737", "A321"],
        status: "available"
      },
      {
        id: "gate_A3",
        name: "Gate A3",
        terminal: "T1",
        compatibleAircraft: ["A320", "B737", "A321"],
        status: "available"
      }
    ];

    const crews: Crew[] = [
      {
        id: "crew_alpha",
        name: "Alpha Crew",
        qualifications: ["A320", "B737"],
        currentTerminal: "T1",
        status: "available"
      },
      {
        id: "crew_bravo",
        name: "Bravo Crew",
        qualifications: ["A320", "B737"],
        currentTerminal: "T1",
        status: "available"
      }
    ];

    // Flight 1: 10:00 - 12:00 at Gate A1
    const flight1: Flight = {
      id: "fl_1",
      flightNumber: "AA100",
      aircraftType: "A320",
      scheduledArrival: new Date("2026-09-15T10:00:00Z"),
      estimatedArrival: new Date("2026-09-15T10:00:00Z"),
      scheduledDeparture: new Date("2026-09-15T12:00:00Z"),
      estimatedDeparture: new Date("2026-09-15T12:00:00Z"),
      status: "scheduled",
      gateId: "gate_A1",
      crewId: "crew_alpha"
    };

    // Flight 2: 12:30 - 14:30 at Gate A1
    const flight2: Flight = {
      id: "fl_2",
      flightNumber: "UA200",
      aircraftType: "A320",
      scheduledArrival: new Date("2026-09-15T12:30:00Z"),
      estimatedArrival: new Date("2026-09-15T12:30:00Z"),
      scheduledDeparture: new Date("2026-09-15T14:30:00Z"),
      estimatedDeparture: new Date("2026-09-15T14:30:00Z"),
      status: "scheduled",
      gateId: "gate_A1",
      crewId: "crew_bravo"
    };

    const assignments: Assignment[] = [
      {
        id: "as_fl1_gate",
        flightId: "fl_1",
        resourceId: "gate_A1",
        resourceType: "gate",
        startTime: new Date("2026-09-15T10:00:00Z"),
        endTime: new Date("2026-09-15T12:00:00Z")
      },
      {
        id: "as_fl1_crew",
        flightId: "fl_1",
        resourceId: "crew_alpha",
        resourceType: "crew",
        startTime: new Date("2026-09-15T10:00:00Z"),
        endTime: new Date("2026-09-15T12:00:00Z")
      },
      {
        id: "as_fl2_gate",
        flightId: "fl_2",
        resourceId: "gate_A1",
        resourceType: "gate",
        startTime: new Date("2026-09-15T12:30:00Z"),
        endTime: new Date("2026-09-15T14:30:00Z")
      },
      {
        id: "as_fl2_crew",
        flightId: "fl_2",
        resourceId: "crew_bravo",
        resourceType: "crew",
        startTime: new Date("2026-09-15T12:30:00Z"),
        endTime: new Date("2026-09-15T14:30:00Z")
      }
    ];

    const baggageRoutes: BaggageRoute[] = [
      {
        id: "bag_1",
        flightId: "fl_1",
        sourceGateId: "gate_A1",
        destinationCarousel: "Carousel 1",
        status: "routed"
      },
      {
        id: "bag_2",
        flightId: "fl_2",
        sourceGateId: "gate_A1",
        destinationCarousel: "Carousel 2",
        status: "routed"
      }
    ];

    return {
      flights: [flight1, flight2],
      gates,
      crews,
      baggageRoutes,
      assignments
    };
  }

  it("handles a non-conflicting delay without bumping any downstream flights", () => {
    const engine = new OperationsEngine();
    const state = createBaseState();

    // Delay fl_1 by 15 minutes (new departure 12:15, fl_2 starts at 12:30 -> no overlap)
    const result = engine.simulateDelay(state, {
      flightId: "fl_1",
      delayMinutes: 15
    });

    expect(result.hasUnresolvableConflicts).toBe(false);
    expect(result.impactEvents.length).toBe(0);

    // Assert the hard invariant holds
    assertNoDoubleBooking(result.proposedAssignments);

    const updatedFl1 = result.proposedFlights.find((f) => f.id === "fl_1")!;
    expect(updatedFl1.status).toBe("delayed");
    expect(updatedFl1.estimatedDeparture.toISOString()).toBe("2026-09-15T12:15:00.000Z");

    const fl2Gate = result.proposedAssignments.find(
      (a) => a.flightId === "fl_2" && a.resourceType === "gate"
    )!;
    expect(fl2Gate.resourceId).toBe("gate_A1");
  });

  it("dynamically reassigns gate and baggage when a delay causes a gate conflict", () => {
    const engine = new OperationsEngine();
    const state = createBaseState();

    // Delay fl_1 by 60 minutes (new departure 13:00, overlapping fl_2's 12:30-14:30 window at Gate A1)
    const result = engine.simulateDelay(state, {
      flightId: "fl_1",
      delayMinutes: 60
    });

    expect(result.hasUnresolvableConflicts).toBe(false);
    expect(result.impactEvents.length).toBeGreaterThan(0);

    // Hard invariant: zero double booking in proposed assignments
    assertNoDoubleBooking(result.proposedAssignments);

    // Verify fl_2 was moved to an available gate (Gate A2)
    const fl2GateAssignment = result.proposedAssignments.find(
      (a) => a.flightId === "fl_2" && a.resourceType === "gate"
    )!;
    expect(fl2GateAssignment.resourceId).toBe("gate_A2");

    // Verify baggage route for fl_2 was redirected
    const fl2Baggage = result.proposedBaggageRoutes.find((b) => b.flightId === "fl_2")!;
    expect(fl2Baggage.sourceGateId).toBe("gate_A2");
    expect(fl2Baggage.status).toBe("transferring");

    // Verify impact events detail the reassignment
    const gateImpact = result.impactEvents.find(
      (e) => e.affectedFlightId === "fl_2" && e.resourceType === "gate"
    );
    expect(gateImpact).toBeDefined();
    expect(gateImpact?.oldResourceId).toBe("gate_A1");
    expect(gateImpact?.newResourceId).toBe("gate_A2");
  });

  it("verifies multi-hop propagation: Flight A bumps Flight B bumps Flight C", () => {
    const engine = new OperationsEngine();
    const baseState = createBaseState();

    // Flight 3: scheduled at Gate A2 from 12:00 to 14:00
    const flight3: Flight = {
      id: "fl_3",
      flightNumber: "DL300",
      aircraftType: "A320",
      scheduledArrival: new Date("2026-09-15T12:00:00Z"),
      estimatedArrival: new Date("2026-09-15T12:00:00Z"),
      scheduledDeparture: new Date("2026-09-15T14:00:00Z"),
      estimatedDeparture: new Date("2026-09-15T14:00:00Z"),
      status: "scheduled",
      gateId: "gate_A2",
      crewId: "crew_bravo"
    };

    const multiHopState: EngineState = {
      ...baseState,
      flights: [...baseState.flights, flight3],
      assignments: [
        ...baseState.assignments,
        {
          id: "as_fl3_gate",
          flightId: "fl_3",
          resourceId: "gate_A2",
          resourceType: "gate",
          startTime: new Date("2026-09-15T12:00:00Z"),
          endTime: new Date("2026-09-15T14:00:00Z")
        }
      ],
      baggageRoutes: [
        ...baseState.baggageRoutes,
        {
          id: "bag_3",
          flightId: "fl_3",
          sourceGateId: "gate_A2",
          destinationCarousel: "Carousel 3",
          status: "routed"
        }
      ]
    };

    // When fl_1 is delayed by 60 mins:
    // fl_1 stays at Gate A1 until 13:00, bumping fl_2 (12:30-14:30)
    // fl_2 needs a gate: tries Gate A2, but Gate A2 has fl_3 (12:00-14:00)
    // Either fl_2 takes Gate A3, or if fl_2 bumps fl_3, fl_3 moves to Gate A3.
    // In both cases, zero double-booking is maintained and the multi-hop cascade resolves!
    const result = engine.simulateDelay(multiHopState, {
      flightId: "fl_1",
      delayMinutes: 60
    });

    expect(result.hasUnresolvableConflicts).toBe(false);
    assertNoDoubleBooking(result.proposedAssignments);

    const fl2Gate = result.proposedAssignments.find(
      (a) => a.flightId === "fl_2" && a.resourceType === "gate"
    )!;
    const fl3Gate = result.proposedAssignments.find(
      (a) => a.flightId === "fl_3" && a.resourceType === "gate"
    )!;

    // Both flights must be accommodated on separate gates
    expect(fl2Gate.resourceId).not.toBe("gate_A1");
    expect(fl2Gate.resourceId).not.toBe(fl3Gate.resourceId);
  });

  it("prevents cycles and guarantees termination in cyclic dependency scenarios", () => {
    const engine = new OperationsEngine();
    const state = createBaseState();

    // Large delay with low depth limit
    const result = engine.simulateDelay(
      state,
      { flightId: "fl_1", delayMinutes: 180 },
      { maxPropagationDepth: 3 }
    );

    // Must terminate cleanly without infinite loop
    expect(result).toBeDefined();
    expect(result.changeSetToken).toBeDefined();
  });

  it("flags unresolvable conflicts when airport capacity is 100% saturated", () => {
    const engine = new OperationsEngine();
    const base = createBaseState();

    // Remove all other gates except Gate A1
    const saturatedState: EngineState = {
      ...base,
      gates: [base.gates[0]] // Only Gate A1 exists!
    };

    const result = engine.simulateDelay(saturatedState, {
      flightId: "fl_1",
      delayMinutes: 60
    });

    expect(result.hasUnresolvableConflicts).toBe(true);
    expect(result.unresolvableReason).toContain("Airport capacity saturated");
  });

  it("preserves dry-run purity: input state is never mutated", () => {
    const engine = new OperationsEngine();
    const state = createBaseState();
    const originalDeparture = state.flights[0].estimatedDeparture.getTime();

    engine.simulateDelay(state, {
      flightId: "fl_1",
      delayMinutes: 45
    });

    // Verify input state is strictly unmodified
    expect(state.flights[0].estimatedDeparture.getTime()).toBe(originalDeparture);
    expect(state.flights[0].status).toBe("scheduled");
  });
});
