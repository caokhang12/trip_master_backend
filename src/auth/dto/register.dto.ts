import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'newjohn.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    minLength: 8,
    description:
      'Mật khẩu tối thiểu 8 ký tự, phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt. / Password must be at least 8 characters and include uppercase, lowercase, number and special character.',
    example: 'Str0ng!Pass',
  })
  @IsString()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 8 characters and include uppercase, lowercase, number and special character.',
    },
  )
  password!: string;

  @ApiProperty({ required: false, example: 'Minh' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, example: 'Nguyen' })
  @IsOptional()
  @IsString()
  lastName?: string;
}
