import { Module } from "@nestjs/common";
import { LockService } from "./lock.service.js";

@Module({
  providers: [LockService],
  exports: [LockService]
})
export class LockModule {}
