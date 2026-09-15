import { Module } from "@nestjs/common";
import { AssignmentsController } from "./assignments.controller.js";
import { AssignmentsService } from "./assignments.service.js";
import { EngineModule } from "../engine/engine.module.js";
import { PersistenceModule } from "../persistence/persistence.module.js";
import { LockModule } from "../locks/lock.module.js";
import { GatewayModule } from "../gateway/gateway.module.js";
import { FlightsModule } from "../flights/flights.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [
    EngineModule,
    PersistenceModule,
    LockModule,
    GatewayModule,
    FlightsModule,
    NotificationsModule
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService]
})
export class AssignmentsModule {}

