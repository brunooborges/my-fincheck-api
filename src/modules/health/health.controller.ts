import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { IsPublic } from 'src/shared/decorators/IsPublic';
import { SKIP_ALL_THROTTLERS } from 'src/shared/throttling/throttling.module';

/**
 * The front end's wake-up check. Free hosts put the API to sleep when idle; the front end pings
 * this until it answers. It touches no database (a sleeping database is woken by the real
 * requests) and is neither authenticated nor rate-limited.
 */
@IsPublic()
@SkipThrottle(SKIP_ALL_THROTTLERS)
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
