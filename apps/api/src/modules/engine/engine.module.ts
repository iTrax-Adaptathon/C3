import { Module } from "@nestjs/common";
import { EngineService } from "./engine.service.js";

@Module({
  providers: [EngineService],
  exports: [EngineService]
})
export class EngineModule {}
