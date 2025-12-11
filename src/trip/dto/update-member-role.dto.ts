import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MemberRole } from 'src/schemas/trip-member.entity';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role to assign to the member',
    enum: MemberRole,
    example: MemberRole.EDITOR,
  })
  @IsEnum(MemberRole)
  @IsNotEmpty()
  role: MemberRole;
}
