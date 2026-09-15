import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Inject
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import type { NotificationStatus } from "@c3/shared";

@Controller()
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService
  ) {}

  @Get("notifications/stats")
  public getNotificationStats() {
    return this.notificationsService.getNotificationStats();
  }

  @Get("notifications")
  public getNotifications(
    @Query("flightId") flightId?: string,
    @Query("status") status?: NotificationStatus
  ) {
    return this.notificationsService.getNotifications({ flightId, status });
  }

  @Post("notifications/:id/retry")
  public async retryNotification(@Param("id") id: string) {
    const updated = await this.notificationsService.retryNotification(id);
    return {
      success: updated.status === "DELIVERED" || updated.status === "SENT",
      notification: updated
    };
  }

  @Get("passenger/portal/:token")
  public getPassengerPortal(@Param("token") token: string) {
    return this.notificationsService.getPassengerPortalData(token);
  }

  @Get("passengers/manifest/:flightId")
  public getPassengerManifest(@Param("flightId") flightId: string) {
    return this.notificationsService.getPassengerManifest(flightId);
  }
}
