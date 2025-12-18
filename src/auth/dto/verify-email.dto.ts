import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token',
    example: 'c0f5c3b2c4a9481d9b2e5c6f8d9a7b3e',
  })
  @IsString()
  token!: string;
}
