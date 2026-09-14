import { Module } from "@nestjs/common";
import { EngineModule } from "./modules/engine/engine.module.js";
import { PersistenceModule } from "./modules/persistence/persistence.module.js";
import { LockModule } from "./modules/locks/lock.module.js";
import { GatewayModule } from "./modules/gateway/gateway.module.js";
import { FlightsModule } from "./modules/flights/flights.module.js";
import { AssignmentsModule } from "./modules/assignments/assignments.module.js";
import { BoardModule } from "./modules/board/board.module.js";

@Module({
  imports: [
    EngineModule,
    PersistenceModule,
    LockModule,
    GatewayModule,
    FlightsModule,
    AssignmentsModule,
    BoardModule
  ]
})
export class AppModule {}
