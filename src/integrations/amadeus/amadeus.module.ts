import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AmadeusAuthService } from './amadeus-auth.service';
import { AmadeusApiService } from './amadeus-api.service';

@Module({
  imports: [ConfigModule],
  providers: [AmadeusAuthService, AmadeusApiService],
  exports: [AmadeusAuthService, AmadeusApiService],
})
export class AmadeusModule {}
