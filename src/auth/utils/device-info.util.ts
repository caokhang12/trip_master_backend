import { Request } from 'express';

/**
 * Device information interface for tracking login sessions
 */
export interface DeviceInfo {
  userAgent?: string;
  ip?: string;
  deviceType?: 'web' | 'mobile' | 'tablet';
  deviceName?: string;
}

/**
 * Utility class for extracting and parsing device information from requests
 */
export class DeviceInfoUtil {
  /**
   * Extract device information from request object
   */
  static extractFromRequest(req: Request): DeviceInfo {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    return {
      userAgent,
      ip,
      deviceType: this.detectDeviceType(userAgent),
      deviceName: this.extractDeviceName(userAgent),
    };
  }

  /**
   * Detect device type from user agent string
   */
  private static detectDeviceType(
    userAgent: string,
  ): 'web' | 'mobile' | 'tablet' {
    const ua = userAgent.toLowerCase();

    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }

    if (
      ua.includes('mobile') ||
      ua.includes('iphone') ||
      ua.includes('android')
    ) {
      return 'mobile';
    }

    return 'web';
  }

  /**
   * Extract device/browser name from user agent
   */
  private static extractDeviceName(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    // Mobile devices
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('ipad')) return 'iPad';
    if (ua.includes('android')) return 'Android Device';

    // Browsers
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edg')) return 'Microsoft Edge';
    if (ua.includes('opera')) return 'Opera';

    return 'Unknown Device';
  }

  /**
   * Sanitize device info for client response (remove sensitive data)
   */
  static sanitizeForResponse(deviceInfo: DeviceInfo): Partial<DeviceInfo> {
    return {
      deviceType: deviceInfo.deviceType,
      deviceName: deviceInfo.deviceName,
    };
  }

  /**
   * Create a short device identifier for session display
   */
  static createDeviceIdentifier(deviceInfo: DeviceInfo): string {
    const { deviceType, deviceName } = deviceInfo;
    const type = deviceType
      ? deviceType.charAt(0).toUpperCase() + deviceType.slice(1)
      : 'Unknown';
    return `${deviceName} (${type})`;
  }
}
