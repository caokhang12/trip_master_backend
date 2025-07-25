import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Auth Security (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('HTTP-only Cookie Security', () => {
    it('should set refresh token in HTTP-only cookie on login', async () => {
      const testUser = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      // Register user first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      // Verify email (assuming verification is skipped in test)
      await dataSource.query(
        'UPDATE users SET email_verified = true WHERE email = $1',
        [testUser.email],
      );

      // Login
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      // Verify refresh token is not in response body
      expect(response.body.data.refresh_token).toBeUndefined();

      // Verify HTTP-only cookie is set
      const cookies = response.headers['set-cookie'] as string[] | undefined;
      const refreshTokenCookie = cookies?.find((cookie: string) =>
        cookie.startsWith('refreshToken='),
      );

      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('SameSite=Strict');
      expect(refreshTokenCookie).toContain('Path=/auth/refresh');
    });

    it('should use refresh token from cookie to generate new access token', async () => {
      const testUser = {
        email: 'refresh@example.com',
        password: 'Password123!',
      };

      // Register and verify user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      await dataSource.query(
        'UPDATE users SET email_verified = true WHERE email = $1',
        [testUser.email],
      );

      // Login to get refresh token cookie
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'] as unknown as
        | string[]
        | undefined;
      const refreshTokenCookie = cookies?.find((cookie: string) =>
        cookie.startsWith('refreshToken='),
      );

      // Use refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', refreshTokenCookie || '')
        .expect(200);

      expect(refreshResponse.body.data.access_token).toBeDefined();
      expect(refreshResponse.body.data.refresh_token).toBeUndefined();

      // Should set new refresh token cookie
      const newCookies = refreshResponse.headers['set-cookie'] as unknown as
        | string[]
        | undefined;
      const newRefreshCookie = newCookies?.find((cookie: string) =>
        cookie.startsWith('refreshToken='),
      );
      expect(newRefreshCookie).toBeDefined();
    });

    it('should fail refresh when no cookie is provided', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });
  });

  describe('Account Lockout Security', () => {
    it('should lock account after 5 failed login attempts', async () => {
      const testUser = {
        email: 'lockout@example.com',
        password: 'Password123!',
      };

      // Register and verify user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      await dataSource.query(
        'UPDATE users SET email_verified = true WHERE email = $1',
        [testUser.email],
      );

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: testUser.email, password: 'wrongpassword' })
          .expect(401);
      }

      // 6th attempt should be locked
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);

      expect(response.body.message).toContain('temporarily locked');
    });

    it('should reset failed attempts on successful login', async () => {
      const testUser = {
        email: 'reset@example.com',
        password: 'Password123!',
      };

      // Register and verify user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      await dataSource.query(
        'UPDATE users SET email_verified = true WHERE email = $1',
        [testUser.email],
      );

      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: testUser.email, password: 'wrongpassword' })
          .expect(401);
      }

      // Successful login should reset counter
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      // Check that failed attempts were reset
      const user = await dataSource.query(
        'SELECT failed_login_attempts FROM users WHERE email = $1',
        [testUser.email],
      );

      expect(user[0].failed_login_attempts).toBe(0);
    });
  });

  describe('Session Management', () => {
    let accessToken: string;
    let refreshCookie: string;

    beforeEach(async () => {
      const testUser = {
        email: 'session@example.com',
        password: 'Password123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      await dataSource.query(
        'UPDATE users SET email_verified = true WHERE email = $1',
        [testUser.email],
      );

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(200);

      accessToken = loginResponse.body.data.access_token;
      refreshCookie = (
        loginResponse.headers['set-cookie'] as unknown as string[] | undefined
      )?.find((cookie: string) => cookie.startsWith('refreshToken='));
    });

    it('should return active sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshCookie)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('deviceInfo');
      expect(response.body.data[0]).toHaveProperty('isCurrent', true);
    });

    it('should logout and clear refresh token cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshCookie)
        .expect(200);

      expect(response.body.data.logout).toBe(true);

      // Cookie should be cleared
      const clearCookie = (
        response.headers['set-cookie'] as unknown as string[] | undefined
      )?.find((cookie: string) => cookie.includes('refreshToken='));
      expect(clearCookie).toContain('Max-Age=0');
    });

    it('should logout from all devices', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshCookie)
        .expect(200);

      // Try to use refresh token after logout-all
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(401);
    });

    it('should revoke specific session', async () => {
      // Get sessions
      const sessionsResponse = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshCookie)
        .expect(200);

      const sessionId = sessionsResponse.body.data[0].id;

      // Revoke session
      await request(app.getHttpServer())
        .delete(`/auth/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Session should no longer be active
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(401);
    });
  });

  describe('Multi-Device Session Support', () => {
    it('should support multiple device sessions', async () => {
      const testUser = {
        email: 'multidevice@example.com',
        password: 'Password123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      await dataSource.query(
        'UPDATE users SET email_verified = true WHERE email = $1',
        [testUser.email],
      );

      // Login from device 1 (web)
      const device1Response = await request(app.getHttpServer())
        .post('/auth/login')
        .set(
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        )
        .send(testUser)
        .expect(200);

      // Login from device 2 (mobile)
      const device2Response = await request(app.getHttpServer())
        .post('/auth/login')
        .set(
          'User-Agent',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        )
        .send(testUser)
        .expect(200);

      // Check active sessions using device 1 token
      const sessionsResponse = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set(
          'Authorization',
          `Bearer ${device1Response.body.data.access_token}`,
        )
        .expect(200);

      expect(sessionsResponse.body.data).toHaveLength(2);

      // Should have different device types
      const deviceTypes = sessionsResponse.body.data.map(
        (session: any) => session.deviceInfo.deviceType,
      );
      expect(deviceTypes).toContain('web');
      expect(deviceTypes).toContain('mobile');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const requests: Promise<any>[] = [];

      // Make rapid requests (more than 5 per minute)
      for (let i = 0; i < 7; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'wrong' }),
        );
      }

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimited = responses.some(
        (response: any) => response.status === 429,
      );
      expect(rateLimited).toBe(true);
    });

    it('should rate limit refresh token requests', async () => {
      const requests: Promise<any>[] = [];

      // Make rapid refresh requests (more than 10 per minute)
      for (let i = 0; i < 12; i++) {
        requests.push(request(app.getHttpServer()).post('/auth/refresh'));
      }

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimited = responses.some(
        (response: any) => response.status === 429,
      );
      expect(rateLimited).toBe(true);
    });
  });
});
