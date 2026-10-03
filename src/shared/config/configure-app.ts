import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

const MAX_BODY_SIZE = '10kb';
const PREFLIGHT_MAX_AGE_SECONDS = 600;

export interface AppOptions {
  allowedOrigins: string[];
  trustProxy: number;
}

/** Everything about how the app talks to the outside world, in one place so it can be tested. */
export function configureApp(
  app: NestExpressApplication,
  { allowedOrigins, trustProxy }: AppOptions,
): void {
  // Count visitors by their real address, not the host's load balancer.
  app.set('trust proxy', trustProxy);
  app.disable('x-powered-by');

  app.useBodyParser('json', { limit: MAX_BODY_SIZE });
  app.useGlobalPipes(new ValidationPipe());

  // Only the configured front ends may call the API from a browser.
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: PREFLIGHT_MAX_AGE_SECONDS,
  });
}
