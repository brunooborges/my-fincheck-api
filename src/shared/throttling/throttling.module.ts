import { DynamicModule, ExecutionContext, Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { Request } from 'express';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export interface Limit {
  limit: number;
  /** Window length in milliseconds. */
  ttl: number;
}

export interface ThrottlingLimits {
  /** Everything, per visitor address. */
  general: Limit;
  /** Writes (anything but GET, HEAD, OPTIONS). */
  writes: Limit;
  /** POST /auth/signup: an open demo could otherwise be filled with accounts. */
  signup: Limit;
  /** POST /auth/signin: slows down password guessing. */
  signin: Limit;
}

export const DEFAULT_LIMITS: ThrottlingLimits = {
  general: { limit: 120, ttl: MINUTE },
  writes: { limit: 20, ttl: MINUTE },
  signup: { limit: 5, ttl: HOUR },
  signin: { limit: 10, ttl: 15 * MINUTE },
};

/** Names of every throttler, for routes that must skip all of them (a bare @SkipThrottle() skips only "default"). */
export const SKIP_ALL_THROTTLERS = {
  general: true,
  writes: true,
  signup: true,
  signin: true,
};

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];

function requestOf(context: ExecutionContext): Request {
  return context.switchToHttp().getRequest<Request>();
}

function isPost(context: ExecutionContext, path: string): boolean {
  const request = requestOf(context);
  return request.method === 'POST' && request.path.replace(/\/+$/, '') === path;
}

/**
 * Per-visitor limits kept in memory, which is enough for a single free instance (they reset when
 * it restarts). All of a visitor's requests share one budget per limit, whatever the route.
 */
@Module({})
export class ThrottlingModule {
  static forRoot(limits: ThrottlingLimits = DEFAULT_LIMITS): DynamicModule {
    return {
      module: ThrottlingModule,
      imports: [
        ThrottlerModule.forRoot({
          generateKey: (context, tracker, throttlerName) =>
            `${throttlerName}-${tracker}`,
          throttlers: [
            { name: 'general', ...limits.general },
            {
              name: 'writes',
              ...limits.writes,
              skipIf: (context) =>
                READ_METHODS.includes(requestOf(context).method),
            },
            {
              name: 'signup',
              ...limits.signup,
              skipIf: (context) => !isPost(context, '/auth/signup'),
            },
            {
              name: 'signin',
              ...limits.signin,
              skipIf: (context) => !isPost(context, '/auth/signin'),
            },
          ],
        }),
      ],
      exports: [ThrottlerModule],
    };
  }
}
