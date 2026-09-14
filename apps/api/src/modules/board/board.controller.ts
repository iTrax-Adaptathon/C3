import { Controller, Get, Inject } from "@nestjs/common";
import { BoardService } from "./board.service.js";
import type { ImpactEvent, OpsBoardState } from "@c3/shared";

@Controller()
export class BoardController {
  constructor(@Inject(BoardService) private readonly boardService: BoardService) {}

  @Get(["board", "api/board"])
  async getBoard(): Promise<OpsBoardState> {
    return this.boardService.getBoardState();
  }

  @Get(["events/history", "api/events/history"])
  async getEventHistory(): Promise<ImpactEvent[]> {
    return this.boardService.getEventHistory();
  }
}
