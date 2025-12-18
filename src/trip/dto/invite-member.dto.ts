import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MemberRole } from 'src/schemas/trip-member.entity';

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email address of the person to invite',
    example: 'collaborator@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Role to assign to the invited member',
    enum: MemberRole,
    example: MemberRole.EDITOR,
  })
  @IsEnum(MemberRole)
  @IsNotEmpty()
  role!: MemberRole;
}
