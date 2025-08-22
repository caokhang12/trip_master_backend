import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    description: 'User email to resend verification',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;
}
