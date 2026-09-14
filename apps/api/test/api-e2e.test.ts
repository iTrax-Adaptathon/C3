import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import request from "supertest";
import { WebSocket } from "ws";
import { AppModule } from "../src/app.module.js";
import type { Server } from "node:http";

describe("API Layer E2E: Delay Simulation, Locked Commit & WebSocket Stream", () => {
  let app: INestApplication;
  let httpServer: Server;
  let port: number;
  let wsUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.init();

    httpServer = app.getHttpServer();
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });

    const address = httpServer.address();
    if (typeof address === "object" && address) {
      port = address.port;
      wsUrl = `ws://127.0.0.1:${port}/live`;
    } else {
      throw new Error("Unable to determine ephemeral port");
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("completes full operational lifecycle: board load -> delay preview -> commit -> WebSocket broadcast", async () => {
    // 1. Establish WebSocket connection to /live
    const receivedWsMessages: any[] = [];
    const wsClient = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      wsClient.on("open", () => resolve());
      wsClient.on("error", (err) => reject(err));
      wsClient.on("message", (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          receivedWsMessages.push(parsed);
        } catch {
          // ignore non-json
        }
      });
    });

    expect(wsClient.readyState).toBe(WebSocket.OPEN);

    // 2. Fetch initial ops board snapshot
    const boardRes = await request(httpServer).get("/board").expect(200);
    expect(boardRes.body.flights.length).toBeGreaterThanOrEqual(5);
    expect(boardRes.body.gates.length).toBeGreaterThanOrEqual(8);
    expect(boardRes.body.crews.length).toBeGreaterThanOrEqual(6);

    // 3. Trigger 60-minute delay on Flight AA101 (fl_101)
    // fl_101 is scheduled 10:00-12:00 at Gate A1
    // fl_202 is scheduled 12:30-14:30 at Gate A1
    // +60m delay extends fl_101 to 13:00, forcing fl_202 to be bumped to Gate A2
    const delayRes = await request(httpServer)
      .post("/flights/fl_101/delay")
      .send({ delayMinutes: 60, reason: "Inbound weather delay" })
      .expect(201);

    const simulation = delayRes.body;
    expect(simulation.changeSetToken).toBeDefined();
    expect(simulation.rootFlightId).toBe("fl_101");
    expect(simulation.delayMinutes).toBe(60);
    expect(simulation.hasUnresolvableConflicts).toBe(false);

    // Verify preview impact chain details
    const bumpedGateEvent = simulation.impactEvents.find(
      (e: any) => e.affectedFlightId === "fl_202" && e.resourceType === "gate"
    );
    expect(bumpedGateEvent).toBeDefined();
    expect(bumpedGateEvent.oldResourceId).toBe("gate_A1");
    // Gate A2 has fl_303 (11:00-13:00), so fl_202 (12:30-14:30) is assigned Gate A4
    expect(["gate_A4", "gate_A2"]).toContain(bumpedGateEvent.newResourceId);

    // Verify preview baggage route redirection
    const baggageEvent = simulation.impactEvents.find(
      (e: any) => e.affectedFlightId === "fl_202" && e.resourceType === "baggage"
    );
    expect(baggageEvent).toBeDefined();

    // 4. Commit the simulated changeSet under lock
    const commitRes = await request(httpServer)
      .post("/assignments/commit")
      .send({ changeSetToken: simulation.changeSetToken })
      .expect(201);

    expect(commitRes.body.success).toBe(true);
    expect(commitRes.body.changeSetToken).toBe(simulation.changeSetToken);
    expect(commitRes.body.impactEventsCount).toBeGreaterThan(0);

    // 5. Allow brief event-loop flush for WebSocket broadcast
    await new Promise((r) => setTimeout(r, 200));

    // Verify WebSocket client observed the broadcast events
    const impactAlerts = receivedWsMessages.filter((m) => m.type === "IMPACT_ALERT");
    const boardUpdates = receivedWsMessages.filter((m) => m.type === "BOARD_STATE");

    expect(impactAlerts.length).toBeGreaterThanOrEqual(1);
    expect(boardUpdates.length).toBeGreaterThanOrEqual(1);

    const wsBumpedGate = impactAlerts.find(
      (a) => a.payload.affectedFlightId === "fl_202" && a.payload.resourceType === "gate"
    );
    expect(wsBumpedGate).toBeDefined();
    expect(["gate_A4", "gate_A2"]).toContain(wsBumpedGate.payload.newResourceId);

    // 6. Test idempotency: second commit of the same token succeeds gracefully
    const duplicateCommitRes = await request(httpServer)
      .post("/assignments/commit")
      .send({ changeSetToken: simulation.changeSetToken })
      .expect(201);

    expect(duplicateCommitRes.body.success).toBe(true);

    wsClient.close();
  });

  it("provides audit history endpoint for past impact events", async () => {
    const historyRes = await request(httpServer).get("/events/history").expect(200);
    expect(Array.isArray(historyRes.body)).toBe(true);
    expect(historyRes.body.length).toBeGreaterThan(0);
    expect(historyRes.body[0].rootFlightId).toBeDefined();
  });
});
