import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('ping')
  ping() {
    return {
      status: 'ok',
      message: 'pong',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }

  @Get('api/ping')
  apiPing() {
    return {
      status: 'ok',
      message: 'pong',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }
}
