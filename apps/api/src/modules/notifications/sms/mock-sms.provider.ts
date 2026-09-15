import { Injectable, Logger } from "@nestjs/common";
import { SmsProvider, SendSmsResult } from "./sms-provider.interface.js";

@Injectable()
export class MockSmsProvider implements SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  public async sendSms(to: string, message: string): Promise<SendSmsResult> {
    // Mask phone number for privacy in logs
    const maskedPhone =
      to.length > 5
        ? `${to.slice(0, 3)} ******${to.slice(-4)}`
        : to;

    this.logger.log(`\n================== [MOCK SMS DISPATCH] ==================\nTo: ${maskedPhone}\n\n${message}\n========================================================`);

    // Simulate instant delivery for mock provider
    const msgId = `mock_msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    return {
      success: true,
      messageId: msgId,
      status: "DELIVERED"
    };
  }
}
