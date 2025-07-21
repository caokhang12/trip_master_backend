import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRoleGuard } from './admin-role.guard';
import { UserRole } from '../../shared/types/base-response.types';

describe('AdminRoleGuard', () => {
  let guard: AdminRoleGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRoleGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<AdminRoleGuard>(AdminRoleGuard);
  });

  const createMockExecutionContext = (user: any): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }) as any,
      getResponse: () => ({}) as any,
      getNext: () => ({}) as any,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  });

  describe('canActivate', () => {
    it('should return true for admin user', () => {
      const mockUser = {
        id: '123',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      };
      const context = createMockExecutionContext(mockUser);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException for non-admin user', () => {
      const mockUser = {
        id: '123',
        email: 'user@example.com',
        role: UserRole.USER,
      };
      const context = createMockExecutionContext(mockUser);

      expect(() => guard.canActivate(context)).toThrow('Admin access required');
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(
        'User not authenticated',
      );
    });
  });
});
