import { IsString, MinLength } from 'class-validator';
import { Sanitize } from 'class-sanitizer';

export class RegisterUserDto {
  @IsString()
  @MinLength(4)
  @Sanitize((value: string) => value) // Sanitization du username pour prévenir d’éventuelles injections
  username!: string;

  @IsString()
  @MinLength(4)
  // Pour le mot de passe, la sanitization est généralement inutile car il sera haché et n’est pas affiché en clair.
  password!: string;
}
