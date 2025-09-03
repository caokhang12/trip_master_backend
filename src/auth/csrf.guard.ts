import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      method?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const method = req.method || 'GET';

    // Only enforce for state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return true;

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    if (!frontendUrl) return true; // no reference to validate against

    let allowedOrigin: string | undefined;
    try {
      allowedOrigin = new URL(frontendUrl).origin;
    } catch {
      // invalid FRONTEND_URL -> skip
      return true;
    }

    const origin = (req.headers?.origin as string | undefined) || undefined;
    const referer = (req.headers?.referer as string | undefined) || undefined;
    const refOrigin = referer ? safeGetOrigin(referer) : undefined;
    const headerOrigin = origin || refOrigin;

    if (headerOrigin && headerOrigin !== allowedOrigin) {
      throw new ForbiddenException('Invalid request origin');
    }

    // Custom header enforcement (configurable)
    const headerName = this.config.get<string>('CSRF_HEADER_NAME');
    const expectedValue = this.config.get<string>('CSRF_HEADER_VALUE');
    if (headerName) {
      const raw = req.headers?.[headerName.toLowerCase()];
      const actual = Array.isArray(raw)
        ? raw[0]
        : typeof raw === 'string'
          ? raw
          : undefined;
      const token = actual?.trim();

      if (expectedValue) {
        if (!token || token !== expectedValue) {
          throw new ForbiddenException('Invalid CSRF token');
        }
      } else {
        // If a header name is configured but value is not, at least require presence
        if (!token) {
          throw new ForbiddenException('Missing CSRF header');
        }
      }
    }

    return true;
  }
}

function safeGetOrigin(urlStr: string): string | undefined {
  try {
    return new URL(urlStr).origin;
  } catch {
    return undefined;
  }
}
