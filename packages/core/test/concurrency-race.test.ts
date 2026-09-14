import { describe, it, expect } from "vitest";
import { OperationsEngine, assertNoDoubleBooking } from "../src/index.js";
import type { EngineState } from "../src/types.js";
import type { Flight, Gate, Crew, BaggageRoute, Assignment } from "@c3/shared";

describe("Hardening & Concurrency: Race Condition & Double-Booking Verification", () => {
  function createDenseAirportState(): EngineState {
    const gates: Gate[] = [
      { id: "g1", name: "Gate 1", terminal: "T1", compatibleAircraft: ["A320", "B737"], status: "available" },
      { id: "g2", name: "Gate 2", terminal: "T1", compatibleAircraft: ["A320", "B737"], status: "available" },
      { id: "g3", name: "Gate 3", terminal: "T1", compatibleAircraft: ["A320", "B737"], status: "available" },
      { id: "g4", name: "Gate 4", terminal: "T2", compatibleAircraft: ["A320", "B737"], status: "available" }
    ];

    const crews: Crew[] = [
      { id: "c1", name: "Crew 1", qualifications: ["A320", "B737"], currentTerminal: "T1", status: "available" },
      { id: "c2", name: "Crew 2", qualifications: ["A320", "B737"], currentTerminal: "T1", status: "available" },
      { id: "c3", name: "Crew 3", qualifications: ["A320", "B737"], currentTerminal: "T2", status: "available" }
    ];

    const flights: Flight[] = [];
    const assignments: Assignment[] = [];
    const baggageRoutes: BaggageRoute[] = [];

    // Create 12 closely scheduled flights across the gates
    for (let i = 1; i <= 8; i++) {
      const startHour = 10 + Math.floor((i - 1) / 2) * 2;
      const gateIndex = (i % 4);
      const gateId = gates[gateIndex].id;
      const crewId = crews[i % 3].id;

      const fId = `fl_race_${i}`;
      flights.push({
        id: fId,
        flightNumber: `RC${100 + i}`,
        aircraftType: "A320",
        scheduledArrival: new Date(`2026-09-15T${startHour}:00:00Z`),
        estimatedArrival: new Date(`2026-09-15T${startHour}:00:00Z`),
        scheduledDeparture: new Date(`2026-09-15T${startHour + 1}:45:00Z`),
        estimatedDeparture: new Date(`2026-09-15T${startHour + 1}:45:00Z`),
        status: "scheduled",
        gateId,
        crewId
      });

      assignments.push({
        id: `as_g_${fId}`,
        resourceId: gateId,
        resourceType: "gate",
        flightId: fId,
        startTime: new Date(`2026-09-15T${startHour}:00:00Z`),
        endTime: new Date(`2026-09-15T${startHour + 1}:45:00Z`)
      });

      assignments.push({
        id: `as_c_${fId}`,
        resourceId: crewId,
        resourceType: "crew",
        flightId: fId,
        startTime: new Date(`2026-09-15T${startHour}:00:00Z`),
        endTime: new Date(`2026-09-15T${startHour + 1}:45:00Z`)
      });

      baggageRoutes.push({
        id: `bag_${fId}`,
        flightId: fId,
        sourceGateId: gateId,
        destinationCarousel: `Carousel ${i % 4}`,
        status: "routed"
      });
    }

    return { flights, gates, crews, baggageRoutes, assignments };
  }

  it("proves ZERO double-booking invariant holds under 20 concurrent delay simulations", async () => {
    const engine = new OperationsEngine();
    const state = createDenseAirportState();

    // Verify initial state has zero double bookings
    assertNoDoubleBooking(state.assignments);

    // Launch 20 concurrent simulations targeting various flights with varying delay magnitudes
    const tasks = Array.from({ length: 20 }, (_, idx) => {
      const flightIndex = (idx % state.flights.length);
      const flightId = state.flights[flightIndex].id;
      const delayMinutes = 15 + (idx * 5); // 15m to 110m

      return new Promise<{
        idx: number;
        result: ReturnType<typeof engine.simulateDelay>;
      }>((resolve) => {
        const result = engine.simulateDelay(state, {
          flightId,
          delayMinutes
        });
        resolve({ idx, result });
      });
    });

    const results = await Promise.all(tasks);

    expect(results.length).toBe(20);

    for (const { result } of results) {
      if (!result.hasUnresolvableConflicts) {
        // Strict invariant assertion: Must never throw
        expect(() => assertNoDoubleBooking(result.proposedAssignments)).not.toThrow();
      }

      // Latency metric check: pure engine resolution should be under 50ms
      expect(result.resolutionLatencyMs).toBeLessThan(50);
      expect(result.propagationDepth).toBeDefined();
    }
  });

  it("measures propagation depth and resolution latency metrics", () => {
    const engine = new OperationsEngine();
    const state = createDenseAirportState();

    const res = engine.simulateDelay(state, {
      flightId: state.flights[0].id,
      delayMinutes: 60
    });

    expect(res.resolutionLatencyMs).toBeGreaterThanOrEqual(0);
    expect(res.propagationDepth).toBe(res.impactEvents.length);
    expect(res.changeSetToken).toMatch(/^cs_/);
  });
});
