import type {
  Assignment,
  BaggageRoute,
  Crew,
  Flight,
  Gate
} from "@c3/shared";
import type { EngineState } from "./types.js";

export interface FlightDependencyNode {
  flight: Flight;
  gate?: Gate;
  crew?: Crew;
  baggageRoute?: BaggageRoute;
  gateAssignment?: Assignment;
  crewAssignment?: Assignment;
  subsequentFlightsAtGate: string[];
  subsequentFlightsWithCrew: string[];
}

export class AirportOperationsGraph {
  private flightNodes = new Map<string, FlightDependencyNode>();
  private gates = new Map<string, Gate>();
  private crews = new Map<string, Crew>();
  private baggage = new Map<string, BaggageRoute>();
  private assignments = new Map<string, Assignment>();

  constructor(state: EngineState) {
    this.build(state);
  }

  private build(state: EngineState): void {
    for (const g of state.gates) this.gates.set(g.id, g);
    for (const c of state.crews) this.crews.set(c.id, c);
    for (const b of state.baggageRoutes) this.baggage.set(b.flightId, b);
    for (const a of state.assignments) this.assignments.set(a.id, a);

    // Initialize flight nodes
    for (const f of state.flights) {
      this.flightNodes.set(f.id, {
        flight: f,
        gate: f.gateId ? this.gates.get(f.gateId) : undefined,
        crew: f.crewId ? this.crews.get(f.crewId) : undefined,
        baggageRoute: this.baggage.get(f.id),
        subsequentFlightsAtGate: [],
        subsequentFlightsWithCrew: []
      });
    }

    // Attach assignments to nodes
    for (const a of state.assignments) {
      const node = this.flightNodes.get(a.flightId);
      if (node) {
        if (a.resourceType === "gate") {
          node.gateAssignment = a;
        } else if (a.resourceType === "crew") {
          node.crewAssignment = a;
        }
      }
    }

    // Connect sequential dependencies on gates and crews
    this.buildSequentialEdges("gate");
    this.buildSequentialEdges("crew");
  }

  private buildSequentialEdges(type: "gate" | "crew"): void {
    const byResource = new Map<string, Assignment[]>();
    for (const a of this.assignments.values()) {
      if (a.resourceType === type) {
        const list = byResource.get(a.resourceId) || [];
        list.push(a);
        byResource.set(a.resourceId, list);
      }
    }

    for (const [, list] of byResource.entries()) {
      // Sort by start time
      list.sort(
        (x, y) =>
          new Date(x.startTime).getTime() - new Date(y.startTime).getTime()
      );

      for (let i = 0; i < list.length - 1; i++) {
        const currentFlightId = list[i].flightId;
        const nextFlightId = list[i + 1].flightId;
        const currentNode = this.flightNodes.get(currentFlightId);
        if (currentNode) {
          if (type === "gate") {
            currentNode.subsequentFlightsAtGate.push(nextFlightId);
          } else {
            currentNode.subsequentFlightsWithCrew.push(nextFlightId);
          }
        }
      }
    }
  }

  public getFlightNode(flightId: string): FlightDependencyNode | undefined {
    return this.flightNodes.get(flightId);
  }

  public getAllFlightNodes(): FlightDependencyNode[] {
    return Array.from(this.flightNodes.values());
  }

  /**
   * Traverses outward from the root flight node to find all potentially impacted flights
   * in the dependency cascade.
   */
  public getDownstreamDependents(rootFlightId: string): string[] {
    const visited = new Set<string>();
    const queue: string[] = [rootFlightId];
    const downstream: string[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = this.flightNodes.get(currentId);
      if (!node) continue;

      const nextFlights = [
        ...node.subsequentFlightsAtGate,
        ...node.subsequentFlightsWithCrew
      ];

      for (const nextId of nextFlights) {
        if (!visited.has(nextId)) {
          downstream.push(nextId);
          queue.push(nextId);
        }
      }
    }

    return downstream;
  }
}
