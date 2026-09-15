import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PersistenceService } from "../persistence/persistence.service.js";
import { OpsGateway } from "../gateway/ops.gateway.js";
import { MockSmsProvider } from "./sms/mock-sms.provider.js";
import { TwilioSmsProvider } from "./sms/twilio-sms.provider.js";
import { SmsProvider } from "./sms/sms-provider.interface.js";
import type {
  FlightChangeDiff,
  PassengerNotification,
  PassengerPortalResponse,
  PassengerManifestResponse,
  PassengerManifestItem,
  NotificationStatus,
  Flight,
  Gate,
  BaggageRoute
} from "@c3/shared";
import type { EngineState, ResolutionPlan } from "@c3/core";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private smsProvider: SmsProvider;

  constructor(
    @Inject(PersistenceService)
    private readonly persistenceService: PersistenceService,
    @Inject(OpsGateway)
    private readonly opsGateway: OpsGateway,
    @Inject(MockSmsProvider)
    private readonly mockSmsProvider: MockSmsProvider,
    @Inject(TwilioSmsProvider)
    private readonly twilioSmsProvider: TwilioSmsProvider
  ) {
    const providerType = process.env.SMS_PROVIDER || "mock";
    if (providerType.toLowerCase() === "twilio") {
      this.smsProvider = this.twilioSmsProvider;
      this.logger.log("Initialized NotificationsService with Twilio SMS Provider");
    } else {
      this.smsProvider = this.mockSmsProvider;
      this.logger.log("Initialized NotificationsService with Mock SMS Provider");
    }
  }

  /**
   * Processes a committed resolution plan, detects state changes per flight,
   * generates smart SMS notifications for affected passengers, and dispatches them.
   * Runs non-blockingly so dispatcher operational commits never fail.
   */
  public async processCommittedPlan(
    previousState: EngineState,
    plan: ResolutionPlan
  ): Promise<number> {
    const currentState = await this.persistenceService.getState();
    let totalNotificationsSent = 0;

    // Detect all affected flights
    const previousFlightsMap = new Map<string, Flight>(previousState.flights.map((f) => [f.id, f]));
    const currentFlightsMap = new Map<string, Flight>(currentState.flights.map((f) => [f.id, f]));

    const previousGatesMap = new Map<string, Gate>(previousState.gates.map((g) => [g.id, g]));
    const currentGatesMap = new Map<string, Gate>(currentState.gates.map((g) => [g.id, g]));

    const previousBaggageMap = new Map<string, BaggageRoute>(previousState.baggageRoutes.map((b) => [b.flightId, b]));
    const currentBaggageMap = new Map<string, BaggageRoute>(currentState.baggageRoutes.map((b) => [b.flightId, b]));

    for (const currentFlight of currentState.flights) {
      const prevFlight = previousFlightsMap.get(currentFlight.id);
      if (!prevFlight) continue;

      const prevGate = prevFlight.gateId ? previousGatesMap.get(prevFlight.gateId) : undefined;
      const currGate = currentFlight.gateId ? currentGatesMap.get(currentFlight.gateId) : undefined;

      const prevBaggage = previousBaggageMap.get(currentFlight.id);
      const currBaggage = currentBaggageMap.get(currentFlight.id);

      // Compare previous vs current flight state
      const departureChanged =
        new Date(prevFlight.estimatedDeparture).getTime() !==
        new Date(currentFlight.estimatedDeparture).getTime();

      const gateChanged = prevFlight.gateId !== currentFlight.gateId;
      const prevTerminal = prevGate?.terminal;
      const currTerminal = currGate?.terminal;
      const terminalChanged = Boolean(prevTerminal && currTerminal && prevTerminal !== currTerminal);

      const baggageChanged = prevBaggage?.destinationCarousel !== currBaggage?.destinationCarousel;
      const statusChanged = prevFlight.status !== currentFlight.status;

      if (!departureChanged && !gateChanged && !terminalChanged && !baggageChanged && !statusChanged) {
        continue;
      }

      // Compute delay minutes diff
      const delayMinutes = Math.round(
        (new Date(currentFlight.estimatedDeparture).getTime() -
          new Date(currentFlight.scheduledDeparture).getTime()) /
          (1000 * 60)
      );

      // Estimate transfer time between terminals (simple configurable map: T1<->T2=10m, T2<->T3=15m, T1<->T3=20m)
      let transferTimeMinutes: number | undefined;
      if (terminalChanged && prevTerminal && currTerminal) {
        const pair = `${prevTerminal}-${currTerminal}`;
        if (pair.includes("T1") && pair.includes("T2")) transferTimeMinutes = 10;
        else if (pair.includes("T2") && pair.includes("T3")) transferTimeMinutes = 15;
        else transferTimeMinutes = 20;
      }

      const diff: FlightChangeDiff = {
        flightId: currentFlight.id,
        flightNumber: currentFlight.flightNumber,
        departureChanged,
        terminalChanged,
        gateChanged,
        baggageChanged,
        statusChanged,
        oldDeparture: prevFlight.estimatedDeparture,
        newDeparture: currentFlight.estimatedDeparture,
        delayMinutes,
        oldTerminal: prevTerminal,
        newTerminal: currTerminal,
        transferTimeMinutes,
        oldGate: prevGate?.name,
        newGate: currGate?.name,
        oldBaggage: prevBaggage?.destinationCarousel,
        newBaggage: currBaggage?.destinationCarousel,
        oldStatus: prevFlight.status,
        newStatus: currentFlight.status
      };

      // Find passengers for this flight
      const passengers = this.persistenceService.getPassengersByFlightId(currentFlight.id);
      if (passengers.length === 0) continue;

      for (const passenger of passengers) {
        // Prevent duplicate processing for same changeSetToken + passenger
        const existingNotifications = this.persistenceService.getNotifications({
          flightId: currentFlight.id
        });
        const isDuplicate = existingNotifications.some(
          (n) => n.changeSetToken === plan.changeSetToken && n.passengerId === passenger.id
        );
        if (isDuplicate) continue;

        // Generate smart SMS message body
        const smsText = this.generateSmartSmsMessage(passenger.name, currentFlight.flightNumber, diff, passenger.secureToken);

        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const notification: PassengerNotification = {
          id: notificationId,
          changeSetToken: plan.changeSetToken,
          passengerId: passenger.id,
          passengerName: passenger.name,
          passengerPhone: passenger.phoneNumber,
          flightId: currentFlight.id,
          flightNumber: currentFlight.flightNumber,
          changes: diff,
          messageBody: smsText,
          status: "PENDING",
          secureToken: passenger.secureToken,
          createdAt: new Date()
        };

        // Save initial pending notification
        this.persistenceService.saveNotification(notification);

        // Dispatch SMS
        try {
          const smsResult = await this.smsProvider.sendSms(passenger.phoneNumber, smsText);
          notification.status = smsResult.status;
          if (smsResult.status === "DELIVERED") {
            notification.sentAt = new Date();
            notification.deliveredAt = new Date();
          } else if (smsResult.status === "SENT") {
            notification.sentAt = new Date();
          } else {
            notification.failureReason = smsResult.failureReason || "SMS delivery failed";
          }
        } catch (err: any) {
          notification.status = "FAILED";
          notification.failureReason = err.message || "Failed to dispatch SMS";
        }

        this.persistenceService.updateNotification(notification);
        totalNotificationsSent++;

        // Broadcast notification update via WebSocket
        this.opsGateway.server?.emit?.("NOTIFICATION_UPDATE", notification);
        this.broadcastNotificationToClients(notification);
      }
    }

    return totalNotificationsSent;
  }

  /**
   * Retries sending a failed notification.
   */
  public async retryNotification(id: string): Promise<PassengerNotification> {
    const notification = this.persistenceService.getNotificationById(id);
    if (!notification) {
      throw new NotFoundException(`Notification with ID '${id}' not found`);
    }

    notification.status = "PENDING";
    notification.failureReason = undefined;
    this.persistenceService.updateNotification(notification);

    try {
      const smsResult = await this.smsProvider.sendSms(notification.passengerPhone, notification.messageBody);
      notification.status = smsResult.status;
      if (smsResult.status === "DELIVERED") {
        notification.sentAt = new Date();
        notification.deliveredAt = new Date();
      } else if (smsResult.status === "SENT") {
        notification.sentAt = new Date();
      } else {
        notification.failureReason = smsResult.failureReason || "SMS retry failed";
      }
    } catch (err: any) {
      notification.status = "FAILED";
      notification.failureReason = err.message || "Failed to retry SMS dispatch";
    }

    this.persistenceService.updateNotification(notification);
    this.broadcastNotificationToClients(notification);

    return notification;
  }

  /**
   * Generates tailored, relevant SMS content based on exact state diff.
   */
  private generateSmartSmsMessage(
    passengerName: string,
    flightNumber: string,
    diff: FlightChangeDiff,
    secureToken: string
  ): string {
    const domain = process.env.PUBLIC_DOMAIN || "http://localhost:3000";
    const portalUrl = `${domain}/p/${secureToken}`;

    const lines: string[] = [];
    lines.push(`✈️ SkyOps Alert - Flight ${flightNumber}`);
    lines.push("");
    lines.push(`Hello ${passengerName}, your flight information has been updated:`);
    lines.push("");

    if (diff.departureChanged && diff.newDeparture) {
      const timeStr = new Date(diff.newDeparture).toISOString().substring(11, 16) + "Z";
      const delayLabel = diff.delayMinutes && diff.delayMinutes > 0 ? ` (+${diff.delayMinutes} mins)` : "";
      lines.push(`• New Departure: ${timeStr}${delayLabel}`);
    } else {
      lines.push(`• Departure: Remains ${diff.oldDeparture ? new Date(diff.oldDeparture).toISOString().substring(11, 16) + "Z" : "On Schedule"}`);
    }

    if (diff.terminalChanged && diff.newTerminal) {
      lines.push(`• Terminal: ${diff.newTerminal} (changed from ${diff.oldTerminal})`);
      if (diff.transferTimeMinutes) {
        lines.push(`  ↳ Estimated transfer time: ~${diff.transferTimeMinutes} mins`);
      }
    } else if (diff.newTerminal) {
      lines.push(`• Terminal: ${diff.newTerminal}`);
    }

    if (diff.gateChanged && diff.newGate) {
      lines.push(`• Gate: ${diff.newGate}`);
    }

    if (diff.baggageChanged && diff.newBaggage) {
      lines.push(`• Baggage Carousel: ${diff.newBaggage}`);
    }

    lines.push("");
    lines.push("View live board & guidance:");
    lines.push(portalUrl);

    return lines.join("\n");
  }

  /**
   * Retrieves data for passenger mobile portal `/p/[token]`
   */
  public async getPassengerPortalData(token: string): Promise<PassengerPortalResponse> {
    const passenger = this.persistenceService.getPassengerByToken(token);
    if (!passenger) {
      throw new NotFoundException(`Invalid or expired passenger portal token '${token}'`);
    }

    const state = await this.persistenceService.getState();
    const flight = state.flights.find((f) => f.id === passenger.flightId);
    if (!flight) {
      throw new NotFoundException(`Flight for passenger not found`);
    }

    const gate = flight.gateId ? state.gates.find((g) => g.id === flight.gateId) || null : null;
    const baggageRoute = state.baggageRoutes.find((b) => b.flightId === flight.id) || null;

    const allNotifs = this.persistenceService.getNotifications({ flightId: flight.id });
    const passengerNotifs = allNotifs.filter((n) => n.passengerId === passenger.id);
    const latestNotif = passengerNotifs[0] || null;

    // Check connecting flight if available
    let connectingFlight: Flight | null = null;
    let missedConnectionRisk: "LOW" | "MEDIUM" | "HIGH" | "NONE" = "NONE";

    if (passenger.connectingFlightId) {
      connectingFlight = state.flights.find((f) => f.id === passenger.connectingFlightId) || null;
      if (connectingFlight) {
        // Layover duration = connecting departure - flight arrival
        const arrivalMs = new Date(flight.estimatedArrival).getTime();
        const connDepMs = new Date(connectingFlight.estimatedDeparture).getTime();
        const layoverMins = (connDepMs - arrivalMs) / (1000 * 60);

        if (layoverMins < 30) missedConnectionRisk = "HIGH";
        else if (layoverMins < 60) missedConnectionRisk = "MEDIUM";
        else missedConnectionRisk = "LOW";
      }
    }

    return {
      passenger,
      flight,
      gate,
      baggageRoute,
      latestNotification: latestNotif,
      notifications: passengerNotifs,
      connectingFlight,
      missedConnectionRisk
    };
  }

  /**
   * Retrieves passenger manifest view for a specific flight
   */
  public async getPassengerManifest(flightId: string): Promise<PassengerManifestResponse> {
    const state = await this.persistenceService.getState();
    const flight = state.flights.find((f) => f.id === flightId);
    if (!flight) {
      throw new NotFoundException(`Flight with ID '${flightId}' not found`);
    }

    const passengers = this.persistenceService.getPassengersByFlightId(flightId);
    const allNotifs = this.persistenceService.getNotifications({ flightId });

    let deliveredCount = 0;
    let failedCount = 0;
    let missedRiskCount = 0;

    const manifestItems: PassengerManifestItem[] = passengers.map((p) => {
      const passengerNotifs = allNotifs.filter((n) => n.passengerId === p.id);
      const latestNotification = passengerNotifs[0] || null;

      if (latestNotification?.status === "DELIVERED") deliveredCount++;
      if (latestNotification?.status === "FAILED") failedCount++;

      let connectingFlightNumber: string | null = null;
      let connectionRisk: "LOW" | "MEDIUM" | "HIGH" | "NONE" = "NONE";

      if (p.connectingFlightId) {
        const connFlight = state.flights.find((f) => f.id === p.connectingFlightId);
        if (connFlight) {
          connectingFlightNumber = connFlight.flightNumber;
          const arrivalMs = new Date(flight.estimatedArrival).getTime();
          const connDepMs = new Date(connFlight.estimatedDeparture).getTime();
          const layoverMins = (connDepMs - arrivalMs) / (1000 * 60);

          if (layoverMins < 30) {
            connectionRisk = "HIGH";
            missedRiskCount++;
          } else if (layoverMins < 60) {
            connectionRisk = "MEDIUM";
            missedRiskCount++;
          } else {
            connectionRisk = "LOW";
          }
        }
      }

      return {
        passenger: p,
        latestNotification,
        connectingFlightNumber,
        connectionRisk
      };
    });

    return {
      flight,
      passengers: manifestItems,
      totalPassengers: passengers.length,
      notificationsDelivered: deliveredCount,
      notificationsFailed: failedCount,
      missedConnectionsAtRisk: missedRiskCount
    };
  }

  public getNotificationStats() {
    return this.persistenceService.getNotificationStats();
  }

  public getNotifications(filter?: { flightId?: string; status?: NotificationStatus }) {
    return this.persistenceService.getNotifications(filter);
  }

  private broadcastNotificationToClients(notification: PassengerNotification): void {
    this.opsGateway.broadcastNotification(notification);
  }
}

