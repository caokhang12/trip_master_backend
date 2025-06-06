import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrencyService,
  ExchangeRates,
  CurrencyConversion,
} from './services/currency.service';
import { CurrencyConversionDto, ExchangeRatesDto } from './dto/currency.dto';
import { ResponseUtil } from '../shared/utils/response.util';

@ApiTags('Currency')
@Controller('currency')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('rates')
  @ApiOperation({ summary: 'Get current exchange rates' })
  @ApiQuery({
    name: 'base',
    required: false,
    description: 'Base currency code (ISO 4217)',
    example: 'USD',
  })
  @ApiQuery({
    name: 'currencies',
    required: false,
    description: 'Comma-separated list of target currencies',
    example: 'VND,EUR,GBP,JPY',
  })
  @ApiResponse({
    status: 200,
    description: 'Exchange rates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'OK' },
        status: { type: 'number', example: 200 },
        data: {
          type: 'object',
          properties: {
            base: { type: 'string', example: 'USD' },
            date: { type: 'string', example: '2024-06-04' },
            rates: {
              type: 'object',
              example: {
                VND: 24350.5,
                EUR: 0.92,
                GBP: 0.79,
                JPY: 157.25,
              },
            },
            lastUpdated: { type: 'string', example: '2024-06-04T08:30:00Z' },
            source: { type: 'string', example: 'exchangerate-api' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Rate Limit Exceeded',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'ERROR' },
        status: { type: 'number', example: 429 },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
            message: {
              type: 'string',
              example: 'Exchange rate API limit exceeded',
            },
            retryAfter: { type: 'number', example: 3600 },
          },
        },
      },
    },
  })
  async getExchangeRates(@Query() ratesDto: ExchangeRatesDto): Promise<{
    result: string;
    status: number;
    data: ExchangeRates;
  }> {
    // Handle the currencies parameter which can be a string or array
    let currencyArray: string[];

    if (Array.isArray(ratesDto.currencies)) {
      currencyArray = ratesDto.currencies;
    } else if (typeof ratesDto.currencies === 'string') {
      currencyArray = ratesDto.currencies
        .split(',')
        .map((c: string) => c.trim().toUpperCase());
    } else {
      currencyArray = ['VND', 'EUR', 'GBP', 'JPY', 'THB', 'SGD'];
    }

    const rates = await this.currencyService.getExchangeRates(
      ratesDto.base || 'USD',
      currencyArray,
    );

    return ResponseUtil.success(rates);
  }

  @Post('convert')
  @HttpCode(200)
  @ApiOperation({ summary: 'Convert currency amount' })
  @ApiBody({
    type: CurrencyConversionDto,
    description: 'Currency conversion parameters',
    examples: {
      'USD to VND': {
        summary: 'Convert USD to Vietnamese Dong',
        value: {
          amount: 100,
          from: 'USD',
          to: 'VND',
        },
      },
      'EUR to USD': {
        summary: 'Convert Euro to US Dollar',
        value: {
          amount: 50,
          from: 'EUR',
          to: 'USD',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Currency converted successfully',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'OK' },
        status: { type: 'number', example: 200 },
        data: {
          type: 'object',
          properties: {
            from: { type: 'string', example: 'USD' },
            to: { type: 'string', example: 'VND' },
            amount: { type: 'number', example: 100 },
            convertedAmount: { type: 'number', example: 2435050 },
            exchangeRate: { type: 'number', example: 24350.5 },
            formattedAmount: { type: 'string', example: '2,435,050 ₫' },
            conversionDate: { type: 'string', example: '2024-06-04T08:30:00Z' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid currency codes or amount',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'ERROR' },
        status: { type: 'number', example: 400 },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'INVALID_CURRENCY' },
            message: {
              type: 'string',
              example: 'Exchange rate not available for ABC',
            },
          },
        },
      },
    },
  })
  async convertCurrency(@Body() conversionDto: CurrencyConversionDto): Promise<{
    result: string;
    status: number;
    data: CurrencyConversion;
  }> {
    const conversion = await this.currencyService.convertCurrency(
      conversionDto.amount,
      conversionDto.from,
      conversionDto.to,
    );

    return ResponseUtil.success(conversion);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular currencies for travelers' })
  @ApiResponse({
    status: 200,
    description: 'Popular currencies retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'OK' },
        status: { type: 'number', example: 200 },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VND' },
              name: { type: 'string', example: 'Vietnamese Dong' },
              symbol: { type: 'string', example: '₫' },
            },
          },
        },
      },
    },
  })
  getPopularCurrencies(): {
    result: string;
    status: number;
    data: any;
  } {
    const currencies = this.currencyService.getPopularCurrencies();

    return ResponseUtil.success(currencies);
  }

  @Get('cache/stats')
  @ApiOperation({ summary: 'Get cache statistics (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'OK' },
        status: { type: 'number', example: 200 },
        data: {
          type: 'object',
          properties: {
            size: { type: 'number', example: 5 },
            keys: {
              type: 'array',
              items: { type: 'string' },
              example: ['USD_VND,EUR,GBP', 'EUR_USD,VND'],
            },
          },
        },
      },
    },
  })
  getCacheStats(): {
    result: string;
    status: number;
    data: any;
  } {
    const stats = this.currencyService.getCacheStats();

    return ResponseUtil.success(stats);
  }

  @Post('cache/clear')
  @HttpCode(200)
  @ApiOperation({ summary: 'Clear exchange rates cache (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared successfully',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'OK' },
        status: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Exchange rates cache cleared' },
      },
    },
  })
  clearCache() {
    this.currencyService.clearCache();

    return ResponseUtil.success('Exchange rates cache cleared');
  }
}
