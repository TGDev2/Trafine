import { IsString, IsIn } from 'class-validator';
import { Sanitize } from 'class-sanitizer';

export class UpdateUserRoleDto {
  @IsString()
  @Sanitize((value: string) => value) // Application de la sanitization pour assurer l'absence de contenu malicieux
  @IsIn(['user', 'moderator', 'admin'])
  role!: string;
}
