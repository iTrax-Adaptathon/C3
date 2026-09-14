import { describe, it, expect } from "vitest";
import {
  assignments,
  flights,
  gates,
  crews,
  baggageRoutes,
  impactEvents
} from "../src/schema/index.js";
import { getTableColumns } from "drizzle-orm";

describe("Database Layer: Schema and Invariant Definitions", () => {
  it("defines assignments table with resourceId, resourceType, start_time, end_time, and time_range", () => {
    const columns = getTableColumns(assignments);

    expect(columns.id).toBeDefined();
    expect(columns.resourceId).toBeDefined();
    expect(columns.resourceType).toBeDefined();
    expect(columns.flightId).toBeDefined();
    expect(columns.startTime).toBeDefined();
    expect(columns.endTime).toBeDefined();
    expect(columns.timeRange).toBeDefined();
  });

  it("defines flights table with lifecycle timestamps and resource foreign keys", () => {
    const columns = getTableColumns(flights);

    expect(columns.id).toBeDefined();
    expect(columns.flightNumber).toBeDefined();
    expect(columns.aircraftType).toBeDefined();
    expect(columns.scheduledDeparture).toBeDefined();
    expect(columns.estimatedDeparture).toBeDefined();
    expect(columns.status).toBeDefined();
    expect(columns.gateId).toBeDefined();
    expect(columns.crewId).toBeDefined();
  });

  it("defines gates, crews, and baggage routes schemas", () => {
    const gateColumns = getTableColumns(gates);
    const crewColumns = getTableColumns(crews);
    const baggageColumns = getTableColumns(baggageRoutes);
    const impactColumns = getTableColumns(impactEvents);

    expect(gateColumns.compatibleAircraft).toBeDefined();
    expect(crewColumns.qualifications).toBeDefined();
    expect(baggageColumns.sourceGateId).toBeDefined();
    expect(baggageColumns.destinationCarousel).toBeDefined();
    expect(impactColumns.rootFlightId).toBeDefined();
    expect(impactColumns.affectedFlightId).toBeDefined();
  });
});
