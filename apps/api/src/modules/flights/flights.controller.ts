import {
  Body,
  Controller,
  Inject,
  Param,
  Post,
  UsePipes,
  ValidationPipe
} from "@nestjs/common";
import { FlightsService } from "./flights.service.js";
import { DelayRequestSchema } from "@c3/shared";
import type { DelayRequest, SimulationResult } from "@c3/shared";

@Controller(["flights", "api/flights"])
export class FlightsController {
  constructor(
    @Inject(FlightsService)
    private readonly flightsService: FlightsService
  ) {}

  @Post(":id/delay")
  async reportDelay(
    @Param("id") flightId: string,
    @Body() body: DelayRequest
  ): Promise<SimulationResult> {
    const validated = DelayRequestSchema.parse(body);
    return this.flightsService.reportDelay(flightId, validated);
  }
}
