import { Injectable } from '@nestjs/common';

/**
 * Centralized token expiry calculation utility
 * Eliminates duplicate expiry parsing logic and provides caching
 */
@Injectable()
export class TokenExpiryUtil {
  private static readonly EXPIRY_CACHE = new Map<string, number>();

  /**
   * Calculate expiry date from duration string with caching
   * @param expiresIn - Duration string (e.g., '7d', '24h', '15m')
   * @param baseDate - Base date for calculation (defaults to now)
   * @returns Calculated expiry date
   */
  static calculateExpiry(expiresIn: string, baseDate: Date = new Date()): Date {
    let milliseconds = this.EXPIRY_CACHE.get(expiresIn);

    if (!milliseconds) {
      milliseconds = this.parseExpiryString(expiresIn);
      this.EXPIRY_CACHE.set(expiresIn, milliseconds);
    }

    return new Date(baseDate.getTime() + milliseconds);
  }

  /**
   * Parse expiry string to milliseconds with validation
   * @param expiresIn - Duration string to parse
   * @returns Milliseconds value
   */
  private static parseExpiryString(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([dhm])$/);
    if (!match) {
      // Default to 24 hours for invalid format
      return 24 * 60 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000; // Default 24 hours
    }
  }

  /**
   * Clear the expiry cache (useful for testing)
   */
  static clearCache(): void {
    this.EXPIRY_CACHE.clear();
  }
}
