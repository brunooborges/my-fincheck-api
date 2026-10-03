import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './shared/config/configure-app';
import { readServerConfig } from './shared/config/server-config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = readServerConfig();

  configureApp(app, config);

  await app.listen(config.port);
}
bootstrap();
