import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";

@Controller()
export class AppController {
  @Get()
  root(@Res() res: Response) {
    // Redirect browser to the Ops Console web application
    return res.redirect("http://localhost:3000");
  }

  @Get("live")
  liveStatus(@Res() res: Response) {
    return res.json({
      service: "C3 Autonomous Airport Operations Gateway",
      status: "online",
      wsUrl: "ws://localhost:3001/live",
      message:
        "This is a WebSocket stream for real-time live events. To view the UI, open http://localhost:3000",
      consoleUrl: "http://localhost:3000"
    });
  }
}
