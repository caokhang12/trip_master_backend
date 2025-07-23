import { HttpStatus } from '@nestjs/common';
import { ResponseUtil } from '../../shared/utils/response.util';
import { BaseResponse } from '../../shared/types/base-response.types';

/**
 * Controller utility for standardized auth response handling
 * Eliminates response duplication patterns
 */
export class AuthControllerUtil {
  /**
   * Create standard authentication success response
   */
  static createAuthResponse<T>(
    data: T,
    status: HttpStatus = HttpStatus.OK,
  ): BaseResponse<T> {
    return ResponseUtil.success(data, status);
  }
}
