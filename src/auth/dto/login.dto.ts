import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    minLength: 8,
    description:
      'Password entered at registration rules: >=8 char (upper, lower, number, symbol). Validation enforced at registration.',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
