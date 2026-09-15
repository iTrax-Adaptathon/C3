import { Injectable, Logger } from "@nestjs/common";
import { SmsProvider, SendSmsResult } from "./sms-provider.interface.js";

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);

  public async sendSms(to: string, message: string): Promise<SendSmsResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
      this.logger.warn("Twilio credentials missing in environment variables. Falling back to Mock dispatch.");
      return {
        success: false,
        status: "FAILED",
        failureReason: "Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)"
      };
    }

    try {
      // Execute REST API request directly to Twilio to avoid heavy SDK dependencies
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      
      const bodyParams = new URLSearchParams();
      bodyParams.append("To", to);
      bodyParams.append("From", fromPhone);
      bodyParams.append("Body", message);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: bodyParams.toString()
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Twilio SMS sending failed: ${errText}`);
        return {
          success: false,
          status: "FAILED",
          failureReason: `Twilio HTTP ${response.status}: ${errText}`
        };
      }

      const data = (await response.json()) as { sid: string; status: string };
      this.logger.log(`Twilio SMS sent successfully. SID: ${data.sid}, Status: ${data.status}`);

      return {
        success: true,
        messageId: data.sid,
        status: "SENT"
      };
    } catch (err: any) {
      this.logger.error(`Twilio SMS exception: ${err.message}`);
      return {
        success: false,
        status: "FAILED",
        failureReason: err.message || "Twilio network failure"
      };
    }
  }
}
