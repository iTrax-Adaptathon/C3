import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EngineService } from "../engine/engine.service.js";
import { PersistenceService } from "../persistence/persistence.service.js";
import type { DelayRequest, SimulationResult } from "@c3/shared";
import type { ResolutionPlan } from "@c3/core";

@Injectable()
export class FlightsService {
  // Cache of pending simulation preview plans awaiting commit
  private pendingPlans = new Map<string, ResolutionPlan>();

  constructor(
    @Inject(EngineService)
    private readonly engineService: EngineService,
    @Inject(PersistenceService)
    private readonly persistenceService: PersistenceService
  ) {}

  public async reportDelay(
    flightId: string,
    dto: DelayRequest
  ): Promise<SimulationResult> {
    const state = await this.persistenceService.getState();
    const flight = state.flights.find((f) => f.id === flightId);
    if (!flight) {
      throw new NotFoundException(`Flight with ID '${flightId}' not found`);
    }

    const simulation = this.engineService.simulateDelay(state, {
      flightId,
      delayMinutes: dto.delayMinutes,
      reason: dto.reason
    });

    const plan: ResolutionPlan = {
      changeSetToken: simulation.changeSetToken,
      rootFlightId: simulation.rootFlightId,
      delayMinutes: simulation.delayMinutes,
      impactEvents: simulation.impactEvents,
      updatedAssignments: simulation.proposedAssignments,
      updatedFlights: simulation.proposedFlights,
      updatedBaggageRoutes: simulation.proposedBaggageRoutes,
      hasUnresolvableConflicts: simulation.hasUnresolvableConflicts,
      unresolvableReason: simulation.unresolvableReason
    };

    this.pendingPlans.set(simulation.changeSetToken, plan);

    return simulation;
  }

  public getPendingPlan(token: string): ResolutionPlan | undefined {
    return this.pendingPlans.get(token);
  }

  public removePendingPlan(token: string): void {
    this.pendingPlans.delete(token);
  }
}
