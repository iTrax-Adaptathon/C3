import { Module } from "@nestjs/common";
import { OpsGateway } from "./ops.gateway.js";

@Module({
  providers: [OpsGateway],
  exports: [OpsGateway]
})
export class GatewayModule {}
