import { Injectable } from "@nestjs/common";
import { OperationsEngine } from "@c3/core";
import type { EngineState, SimulationOptions } from "@c3/core";
import type { SimulationResult } from "@c3/shared";

@Injectable()
export class EngineService {
  private engine: OperationsEngine;

  constructor() {
    this.engine = new OperationsEngine();
  }

  public simulateDelay(
    state: EngineState,
    request: { flightId: string; delayMinutes: number; reason?: string },
    options?: SimulationOptions
  ): SimulationResult {
    return this.engine.simulateDelay(state, request, options);
  }

  public getOperationsGraph(state: EngineState) {
    return this.engine.getOperationsGraph(state);
  }
}
