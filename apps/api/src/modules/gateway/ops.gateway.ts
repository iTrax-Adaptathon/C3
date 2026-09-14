import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from "@nestjs/websockets";
import * as WsLib from "ws";
import { Injectable, Logger } from "@nestjs/common";
import type { ImpactEvent, OpsBoardState } from "@c3/shared";

@Injectable()
@WebSocketGateway({ path: "/live" })
export class OpsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: any;

  private readonly logger = new Logger(OpsGateway.name);
  private connectedClients = new Set<WsLib.WebSocket>();

  handleConnection(client: WsLib.WebSocket) {
    this.connectedClients.add(client);
    this.logger.log(`Client connected to live ops stream. Total active: ${this.connectedClients.size}`);

    client.on("close", () => {
      this.connectedClients.delete(client);
    });
  }

  handleDisconnect(client: WsLib.WebSocket) {
    this.connectedClients.delete(client);
    this.logger.log(`Client disconnected. Total active: ${this.connectedClients.size}`);
  }

  /**
   * Broadcasts an ImpactEvent to all connected ops consoles.
   */
  public broadcastImpact(event: ImpactEvent): void {
    const message = JSON.stringify({
      type: "IMPACT_ALERT",
      payload: event
    });

    this.sendToAll(message);
  }

  /**
   * Broadcasts the updated operations board state to all connected consoles.
   */
  public broadcastBoardUpdate(boardState: OpsBoardState): void {
    const message = JSON.stringify({
      type: "BOARD_STATE",
      payload: boardState
    });

    this.sendToAll(message);
  }

  private sendToAll(message: string): void {
    for (const client of this.connectedClients) {
      if (client.readyState === WsLib.WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          this.logger.warn(`Failed to send WebSocket frame: ${err}`);
        }
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}
