import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DatabaseConfig } from 'src/database/database.config';
import { UserEntity } from 'src/schemas/user.entity';
import { UserPreferencesEntity } from 'src/schemas/user-preferences.entity';
import { UserService } from 'src/users/user.service';
import { TravelStyle } from 'src/shared/types/base-response.types';

/**
 * Database integration test
 * Tests that the database connection and basic operations work correctly
 */
describe('Database Integration', () => {
  let module: TestingModule;
  let userService: UserService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          useClass: DatabaseConfig,
        }),
        TypeOrmModule.forFeature([UserEntity, UserPreferencesEntity]),
      ],
      providers: [UserService, DatabaseConfig],
    }).compile();

    userService = module.get<UserService>(UserService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', () => {
      // This test passes if the module compiles and initializes without errors
      expect(userService).toBeDefined();
    });
  });

  describe('User Operations', () => {
    const testEmail = `test-${Date.now()}@example.com`;
    let createdUserId: string;

    it('should create a new user', async () => {
      const userData = {
        email: testEmail,
        password: 'testPassword123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe('testPassword123'); // Should be hashed

      createdUserId = user.id;
    });

    it('should find user by email', async () => {
      const user = await userService.findByEmail(testEmail);

      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);
      expect(user?.id).toBe(createdUserId);
    });

    it('should find user by ID', async () => {
      const user = await userService.findById(createdUserId);

      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);
      expect(user?.id).toBe(createdUserId);
    });

    it('should update user preferences', async () => {
      const preferencesData = {
        travelStyle: [TravelStyle.ADVENTURE, TravelStyle.CULTURAL],
        budgetRange: { min: 1000, max: 5000, currency: 'USD' },
        interests: ['hiking', 'museums'],
        dietaryRestrictions: ['vegetarian'],
        accessibilityNeeds: [],
      };

      const preferences = await userService.updatePreferences(
        createdUserId,
        preferencesData,
      );

      expect(preferences).toBeDefined();
      expect(preferences.userId).toBe(createdUserId);
      expect(preferences.travelStyle).toEqual([
        TravelStyle.ADVENTURE,
        TravelStyle.CULTURAL,
      ]);
      expect(preferences.interests).toEqual(['hiking', 'museums']);
    });

    it('should verify password correctly', async () => {
      const user = await userService.findById(createdUserId);
      expect(user).toBeDefined();

      if (user) {
        const isValidPassword = await userService.verifyPassword(
          user,
          'testPassword123',
        );
        const isInvalidPassword = await userService.verifyPassword(
          user,
          'wrongPassword',
        );

        expect(isValidPassword).toBe(true);
        expect(isInvalidPassword).toBe(false);
      }
    });

    it('should handle duplicate email creation', async () => {
      const userData = {
        email: testEmail, // Same email as before
        password: 'anotherPassword',
        firstName: 'Another',
        lastName: 'User',
      };

      await expect(userService.createUser(userData)).rejects.toThrow(
        'User with this email already exists',
      );
    });
  });
});
