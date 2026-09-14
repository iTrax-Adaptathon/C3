import { Inject, Injectable } from "@nestjs/common";
import { PersistenceService } from "../persistence/persistence.service.js";
import type { ImpactEvent, OpsBoardState } from "@c3/shared";

@Injectable()
export class BoardService {
  constructor(
    @Inject(PersistenceService)
    private readonly persistenceService: PersistenceService
  ) {}

  public async getBoardState(): Promise<OpsBoardState> {
    return this.persistenceService.getBoardState();
  }

  public async getEventHistory(): Promise<ImpactEvent[]> {
    return this.persistenceService.getImpactHistory();
  }
}
