import { Module } from "@nestjs/common";
import { FlightsController } from "./flights.controller.js";
import { FlightsService } from "./flights.service.js";
import { EngineModule } from "../engine/engine.module.js";
import { PersistenceModule } from "../persistence/persistence.module.js";

@Module({
  imports: [EngineModule, PersistenceModule],
  controllers: [FlightsController],
  providers: [FlightsService],
  exports: [FlightsService]
})
export class FlightsModule {}
