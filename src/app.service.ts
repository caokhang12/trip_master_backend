import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Get application health status including database connection
   */
  getHealthCheck() {
    const dbStatus = this.dataSource.isInitialized
      ? 'connected'
      : 'disconnected';

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        type: this.dataSource.options.type,
      },
      uptime: process.uptime(),
    };
  }
}
