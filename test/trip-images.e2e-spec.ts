import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripEntity } from '../src/schemas/trip.entity';
import { TripImageEntity } from '../src/schemas/trip-image.entity';
import { UserEntity } from '../src/schemas/user.entity';
import { TripModule } from '../src/trip/trip.module';
import { SharedModule } from '../src/shared/shared.module';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TripStatus } from 'src/trip/enum/trip-enum';

// This initial e2e spec covers negative auth cases for new image endpoints.
// Follow up can extend with full positive lifecycle when auth helpers are available.

describe('Trip Images Endpoints (e2e)', () => {
  let app: INestApplication;
  let tripRepo: Repository<TripEntity>;
  let userRepo: Repository<UserEntity>;
  let jwt: JwtService;

  const tripId = '11111111-1111-1111-1111-111111111111';
  const userId = '22222222-2222-2222-2222-222222222222';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [TripEntity, TripImageEntity, UserEntity],
          synchronize: true,
        }),
        SharedModule,
        TripModule,
        JwtModule.register({
          secret: 'test',
          signOptions: { expiresIn: '1h' },
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    tripRepo = moduleFixture.get<Repository<TripEntity>>(
      getRepositoryToken(TripEntity),
    );
    userRepo = moduleFixture.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
    );
    jwt = moduleFixture.get(JwtService);

    // Seed user + trip for future positive tests (ownership)
    const user = userRepo.create({
      id: userId,
      email: 'user@test.com',
      passwordHash: 'hashed',
    });
    await userRepo.save(user);
    const trip = tripRepo.create({
      id: tripId,
      userId,
      title: 'Test Trip',
      description: 'Desc',
      status: TripStatus.PLANNING,
    });
    await tripRepo.save(trip);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /trips/:id/images/sign should return 401 without auth', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/images/sign`)
      .send({
        files: [
          { folder: 'trip_images', publicId: 'x', bytes: 1000, format: 'jpg' },
        ],
      })
      .expect(401);
  });

  it('POST /trips/:id/images/confirm should return 401 without auth', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/images/confirm`)
      .send({ images: [] })
      .expect(401);
  });

  it('PATCH /trips/:id/images/reorder should return 401 without auth', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/trips/${tripId}/images/reorder`)
      .send({ order: [] })
      .expect(401);
  });

  it('PATCH /trips/:id/images/thumbnail should return 401 without auth', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/trips/${tripId}/images/thumbnail`)
      .send({ publicId: 'any' })
      .expect(401);
  });

  it('POST /trips/:id/images/diff should return 401 without auth', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/images/diff`)
      .send({ keep: [] })
      .expect(401);
  });

  it('DELETE /trips/:id/images/:publicId should return 401 without auth', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/trips/${tripId}/images/some-public-id`)
      .expect(401);
  });

  it('GET /trips/:id/images/gallery should return 401 without auth', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/trips/${tripId}/images/gallery`)
      .expect(401);
  });
});
