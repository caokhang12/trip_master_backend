import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  security: {
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  rateLimit: {
    login: { requests: number; window: number };
    register: { requests: number; window: number };
    forgotPassword: { requests: number; window: number };
  };
  cookies: {
    refreshToken: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'strict' | 'lax' | 'none';
      maxAge: number;
      path: string;
    };
  };
  email: {
    verificationTokenExpiry: number;
    passwordResetTokenExpiry: number;
  };
}

export default registerAs(
  'auth',
  (): AuthConfig => ({
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback-access-secret',
      refreshSecret:
        process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    security: {
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
      lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000', 10), // 15 minutes
    },
    rateLimit: {
      login: {
        requests: parseInt(process.env.RATE_LIMIT_LOGIN_REQUESTS || '5', 10),
        window: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW || '60000', 10), // 1 minute
      },
      register: {
        requests: parseInt(process.env.RATE_LIMIT_REGISTER_REQUESTS || '3', 10),
        window: parseInt(
          process.env.RATE_LIMIT_REGISTER_WINDOW || '3600000',
          10,
        ), // 1 hour
      },
      forgotPassword: {
        requests: parseInt(
          process.env.RATE_LIMIT_FORGOT_PASSWORD_REQUESTS || '3',
          10,
        ),
        window: parseInt(
          process.env.RATE_LIMIT_FORGOT_PASSWORD_WINDOW || '900000',
          10,
        ), // 15 minutes
      },
    },
    cookies: {
      refreshToken: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/auth/refresh',
      },
    },
    email: {
      verificationTokenExpiry: parseInt(
        process.env.EMAIL_VERIFICATION_EXPIRY || '86400000',
        10,
      ), // 24 hours
      passwordResetTokenExpiry: parseInt(
        process.env.PASSWORD_RESET_EXPIRY || '3600000',
        10,
      ), // 1 hour
    },
  }),
);
