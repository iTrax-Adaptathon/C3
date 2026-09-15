import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { WsAdapter } from "@nestjs/platform-ws";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const logger = new Logger("C3ApiBootstrap");
  const app = await NestFactory.create(AppModule);

  // Enable WebSocket adapter
  app.useWebSocketAdapter(new WsAdapter(app));

  // Enable CORS for ops web console
  app.enableCors({
    origin: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);
  logger.log(`Autonomous Airport Operations API running on http://localhost:${port}`);
  logger.log(`Live WebSocket stream available at ws://localhost:${port}/live`);
}

bootstrap();
