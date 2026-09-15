import { Module } from "@nestjs/common";
import { PersistenceModule } from "../persistence/persistence.module.js";
import { GatewayModule } from "../gateway/gateway.module.js";
import { NotificationsService } from "./notifications.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { MockSmsProvider } from "./sms/mock-sms.provider.js";
import { TwilioSmsProvider } from "./sms/twilio-sms.provider.js";

@Module({
  imports: [PersistenceModule, GatewayModule],
  providers: [NotificationsService, MockSmsProvider, TwilioSmsProvider],
  controllers: [NotificationsController],
  exports: [NotificationsService]
})
export class NotificationsModule {}
