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

  /**
   * Create standard boolean operation response with proper typing
   */
  static createBooleanResponse<K extends string>(
    operation: K,
    result: boolean,
    status: HttpStatus = HttpStatus.OK,
  ): BaseResponse<Record<K, boolean>> {
    return ResponseUtil.success(
      { [operation]: result } as Record<K, boolean>,
      status,
    );
  }

  /**
   * Create admin test response
   */
  static createAdminTestResponse(
    module: string,
  ): BaseResponse<{ message: string; timestamp: Date }> {
    return ResponseUtil.success({
      message: `${module} module is working correctly`,
      timestamp: new Date(),
    });
  }
}
