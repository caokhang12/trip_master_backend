import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UploadModule } from '../src/upload/upload.module';
import { SharedModule } from '../src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from '../src/schemas/user.entity';
import { TripEntity } from '../src/schemas/trip.entity';

describe('Upload Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [UserEntity, TripEntity],
          synchronize: true,
        }),
        SharedModule,
        UploadModule,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Note: In a real test, you would authenticate and get a real token
    // For now, we'll mock this with a test JWT token
    authToken = 'Bearer test-jwt-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/upload/avatar (POST)', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/upload/avatar')
        .expect(401);
    });

    it('should require a file', () => {
      return request(app.getHttpServer())
        .post('/api/v1/upload/avatar')
        .set('Authorization', authToken)
        .expect(400);
    });

    // Note: Actual file upload tests would require mocking Cloudinary
    // or using a test environment with proper configuration
  });

  describe('/api/v1/upload/trip/:tripId/images (POST)', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/upload/trip/123e4567-e89b-12d3-a456-426614174000/images')
        .expect(401);
    });

    it('should validate trip UUID format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/upload/trip/invalid-uuid/images')
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('/api/v1/upload/general (POST)', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/upload/general')
        .expect(401);
    });
  });

  describe('/api/v1/upload/:publicId (DELETE)', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/upload/test-public-id')
        .expect(401);
    });
  });
});
