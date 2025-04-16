import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Sanitize } from 'class-sanitizer';

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsString()
  // Décorateur class-sanitizer : on nettoie la chaîne (supprime les balises HTML malveillantes)
  @Sanitize((value: string) => value)
  description?: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}
