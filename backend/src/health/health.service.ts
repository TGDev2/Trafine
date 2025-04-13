import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealthStatus() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
