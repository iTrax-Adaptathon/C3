import { z } from "zod";
import { ImpactEventSchema, PassengerNotificationSchema } from "./domain.js";
import { OpsBoardStateSchema } from "./api.js";

export const WsEventTypeSchema = z.enum([
  "SUBSCRIBE",
  "BOARD_STATE",
  "IMPACT_ALERT",
  "ASSIGNMENT_CHANGED",
  "DELAY_REPORTED",
  "NOTIFICATION_UPDATE"
]);
export type WsEventType = z.infer<typeof WsEventTypeSchema>;

export const WsImpactAlertMessageSchema = z.object({
  type: z.literal("IMPACT_ALERT"),
  payload: ImpactEventSchema
});
export type WsImpactAlertMessage = z.infer<typeof WsImpactAlertMessageSchema>;

export const WsBoardUpdateMessageSchema = z.object({
  type: z.literal("BOARD_STATE"),
  payload: OpsBoardStateSchema
});
export type WsBoardUpdateMessage = z.infer<typeof WsBoardUpdateMessageSchema>;

export const WsNotificationUpdateMessageSchema = z.object({
  type: z.literal("NOTIFICATION_UPDATE"),
  payload: PassengerNotificationSchema
});
export type WsNotificationUpdateMessage = z.infer<typeof WsNotificationUpdateMessageSchema>;

export const WsMessageSchema = z.discriminatedUnion("type", [
  WsImpactAlertMessageSchema,
  WsBoardUpdateMessageSchema,
  WsNotificationUpdateMessageSchema
]);
export type WsMessage = z.infer<typeof WsMessageSchema>;

