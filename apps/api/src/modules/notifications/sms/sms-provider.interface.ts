export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  status: "DELIVERED" | "SENT" | "FAILED";
  failureReason?: string;
}

export interface SmsProvider {
  sendSms(to: string, message: string): Promise<SendSmsResult>;
}
