import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const mockDataSource = {
      isInitialized: true,
      options: { type: 'postgres' },
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    it('should return health check data', () => {
      const healthData = appController.getHealth();
      expect(healthData).toHaveProperty('status', 'ok');
      expect(healthData).toHaveProperty('database');
      expect(healthData.database).toHaveProperty('status', 'connected');
      expect(healthData.database).toHaveProperty('type', 'postgres');
    });
  });
});
