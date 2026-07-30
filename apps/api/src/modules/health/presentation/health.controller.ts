import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

/**
 * Lightweight liveness endpoint used by the hosting provider and uptime
 * monitoring during rolling deploys (see DEPLOYMENT.md §7).
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
