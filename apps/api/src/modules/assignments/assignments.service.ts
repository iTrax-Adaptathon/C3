import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import { EngineService } from "../engine/engine.service.js";
import { PersistenceService } from "../persistence/persistence.service.js";
import { LockService } from "../locks/lock.service.js";
import { OpsGateway } from "../gateway/ops.gateway.js";
import { FlightsService } from "../flights/flights.service.js";
import type {
  CommitChangeSetRequest,
  CommitChangeSetResponse,
  SimulationPreviewRequest,
  SimulationResult
} from "@c3/shared";

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @Inject(EngineService)
    private readonly engineService: EngineService,
    @Inject(PersistenceService)
    private readonly persistenceService: PersistenceService,
    @Inject(LockService)
    private readonly lockService: LockService,
    @Inject(OpsGateway)
    private readonly opsGateway: OpsGateway,
    @Inject(FlightsService)
    private readonly flightsService: FlightsService
  ) {}

  public async previewSimulation(
    dto: SimulationPreviewRequest
  ): Promise<SimulationResult> {
    const state = await this.persistenceService.getState();
    const flight = state.flights.find((f) => f.id === dto.flightId);
    if (!flight) {
      throw new NotFoundException(`Flight with ID '${dto.flightId}' not found`);
    }

    return this.engineService.simulateDelay(state, {
      flightId: dto.flightId,
      delayMinutes: dto.delayMinutes
    });
  }

  public async commitChangeSet(
    dto: CommitChangeSetRequest
  ): Promise<CommitChangeSetResponse> {
    if (this.persistenceService.isCommitted(dto.changeSetToken)) {
      this.logger.log(`Idempotent commit request for already applied token: ${dto.changeSetToken}`);
      return {
        success: true,
        changeSetToken: dto.changeSetToken,
        committedAt: new Date(),
        impactEventsCount: 0,
        updatedAssignmentsCount: 0
      };
    }

    const plan = this.flightsService.getPendingPlan(dto.changeSetToken);
    if (!plan) {
      throw new NotFoundException(
        `Simulation plan with token '${dto.changeSetToken}' not found or has expired`
      );
    }

    if (plan.hasUnresolvableConflicts) {
      throw new BadRequestException(
        `Cannot commit plan with unresolvable conflicts: ${plan.unresolvableReason}`
      );
    }

    // Determine all touched resources (gates and crews) to lock
    const touchedResources = [
      ...plan.updatedAssignments.map((a) => a.resourceId),
      ...plan.impactEvents
        .flatMap((e) => [e.oldResourceId, e.newResourceId])
        .filter((id): id is string => Boolean(id))
    ];

    // Execute commit under distributed lock
    const commitResult = await this.lockService.withLock(
      touchedResources,
      async () => {
        this.logger.log(
          `Committing changeSet '${plan.changeSetToken}' under lock for resources: ${touchedResources.join(", ")}`
        );

        const result = await this.persistenceService.commitPlan(plan);

        // Broadcast individual impact events
        for (const impact of plan.impactEvents) {
          this.opsGateway.broadcastImpact(impact);
        }

        // Broadcast updated board state
        const updatedBoard = await this.persistenceService.getBoardState();
        this.opsGateway.broadcastBoardUpdate(updatedBoard);

        this.flightsService.removePendingPlan(plan.changeSetToken);

        return result;
      }
    );

    return {
      success: commitResult.success,
      changeSetToken: plan.changeSetToken,
      committedAt: commitResult.committedAt,
      impactEventsCount: plan.impactEvents.length,
      updatedAssignmentsCount: plan.updatedAssignments.length
    };
  }
}
