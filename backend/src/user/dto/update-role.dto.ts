import { IsString, IsIn } from 'class-validator';

export class UpdateUserRoleDto {
  @IsString()
  @IsIn(['user', 'moderator', 'admin'])
  role!: string;
}
