import { Module } from "@nestjs/common";
import { BoardController } from "./board.controller.js";
import { BoardService } from "./board.service.js";
import { PersistenceModule } from "../persistence/persistence.module.js";

@Module({
  imports: [PersistenceModule],
  controllers: [BoardController],
  providers: [BoardService],
  exports: [BoardService]
})
export class BoardModule {}
