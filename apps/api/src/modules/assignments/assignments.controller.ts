import { Body, Controller, Inject, Post } from "@nestjs/common";
import { AssignmentsService } from "./assignments.service.js";
import {
  CommitChangeSetRequestSchema,
  SimulationPreviewRequestSchema
} from "@c3/shared";
import type {
  CommitChangeSetRequest,
  CommitChangeSetResponse,
  SimulationPreviewRequest,
  SimulationResult
} from "@c3/shared";

@Controller(["assignments", "api/assignments"])
export class AssignmentsController {
  constructor(
    @Inject(AssignmentsService)
    private readonly assignmentsService: AssignmentsService
  ) {}

  @Post("preview")
  async previewSimulation(
    @Body() body: SimulationPreviewRequest
  ): Promise<SimulationResult> {
    const validated = SimulationPreviewRequestSchema.parse(body);
    return this.assignmentsService.previewSimulation(validated);
  }

  @Post("commit")
  async commitChangeSet(
    @Body() body: CommitChangeSetRequest
  ): Promise<CommitChangeSetResponse> {
    const validated = CommitChangeSetRequestSchema.parse(body);
    return this.assignmentsService.commitChangeSet(validated);
  }
}
