import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from '../src/schemas/user.entity';
import { UserPreferencesEntity } from '../src/schemas/user-preferences.entity';

describe('Authentication E2E', () => {
  let app: INestApplication;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockPreferencesRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(UserEntity))
      .useValue(mockUserRepository)
      .overrideProvider(getRepositoryToken(UserPreferencesEntity))
      .useValue(mockPreferencesRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes();
    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    const inputRegisterData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      // Arrange
      const expectedUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: inputRegisterData.email,
        firstName: inputRegisterData.firstName,
        lastName: inputRegisterData.lastName,
        passwordHash: expect.any(String),
        role: 'user',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null); // User doesn't exist
      mockUserRepository.create.mockReturnValue(expectedUser);
      mockUserRepository.save.mockResolvedValue(expectedUser);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(inputRegisterData)
        .expect(HttpStatus.CREATED);

      // Assert
      expect(response.body.result).toBe('OK');
      expect(response.body.status).toBe(HttpStatus.CREATED);
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('refresh_token');
      expect(response.body.data).toHaveProperty('user_profile');
      expect(response.body.data.user_profile.email).toBe(
        inputRegisterData.email,
      );
    });

    it('should return validation error for invalid email', async () => {
      // Arrange
      const invalidData = { ...inputRegisterData, email: 'invalid-email' };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(HttpStatus.BAD_REQUEST);

      // Assert
      expect(response.body.result).toBe('NG');
      expect(response.body.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.data.message).toContain('Validation failed');
    });

    it('should return validation error for short password', async () => {
      // Arrange
      const invalidData = { ...inputRegisterData, password: '123' };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(HttpStatus.BAD_REQUEST);

      // Assert
      expect(response.body.result).toBe('NG');
      expect(response.body.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.data.message).toContain('Validation failed');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const inputLoginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully with valid credentials', async () => {
      // Arrange
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: inputLoginData.email,
        passwordHash: '$2a$12$validHashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      // Mock bcrypt.compare to return true
      jest.doMock('bcryptjs', () => ({
        compare: jest.fn().mockResolvedValue(true),
      }));

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(inputLoginData)
        .expect(HttpStatus.OK);

      // Assert
      expect(response.body.result).toBe('OK');
      expect(response.body.status).toBe(HttpStatus.OK);
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('refresh_token');
      expect(response.body.data).toHaveProperty('user_profile');
    });

    it('should return validation error for missing fields', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      // Assert
      expect(response.body.result).toBe('NG');
      expect(response.body.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.data.message).toContain('Validation failed');
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full registration -> login -> profile flow', async () => {
      // Arrange
      const userData = {
        email: 'integration@example.com',
        password: 'password123',
        firstName: 'Integration',
        lastName: 'Test',
      };

      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...userData,
        passwordHash: expect.any(String),
        role: 'user',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock registration
      mockUserRepository.findOne.mockResolvedValueOnce(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      // Step 1: Register
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(HttpStatus.CREATED);

      expect(registerResponse.body.result).toBe('OK');
      const accessToken = registerResponse.body.data.access_token;

      // Step 2: Get Profile using access token
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const profileResponse = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(profileResponse.body.result).toBe('OK');
      expect(profileResponse.body.data.email).toBe(userData.email);
      expect(profileResponse.body.data.firstName).toBe(userData.firstName);

      // Step 3: Update Profile
      const updateData = {
        firstName: 'UpdatedName',
        preferences: {
          interests: ['travel', 'photography'],
        },
      };

      const updatedUser = { ...mockUser, firstName: 'UpdatedName' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(updatedUser);
      mockPreferencesRepository.findOne.mockResolvedValue(null);
      mockPreferencesRepository.create.mockReturnValue({
        userId: mockUser.id,
        ...updateData.preferences,
      });
      mockPreferencesRepository.save.mockResolvedValue({
        userId: mockUser.id,
        ...updateData.preferences,
      });

      const updateResponse = await request(app.getHttpServer())
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(updateResponse.body.result).toBe('OK');
      expect(updateResponse.body.data.firstName).toBe('UpdatedName');
    });
  });

  describe('GET /api/v1/auth/admin/test', () => {
    it('should return test message', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/admin/test')
        .expect(HttpStatus.OK);

      expect(response.body.result).toBe('OK');
      expect(response.body.data.message).toBe(
        'Auth module is working correctly',
      );
    });
  });

  describe('GET /api/v1/users/admin/test', () => {
    it('should return test message', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/admin/test')
        .expect(HttpStatus.OK);

      expect(response.body.result).toBe('OK');
      expect(response.body.data.message).toBe(
        'Users module is working correctly',
      );
    });
  });
});
