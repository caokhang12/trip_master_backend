import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Health check endpoint that includes database connection status
   */
  @Get('health')
  getHealth() {
    return this.appService.getHealthCheck();
  }
}
