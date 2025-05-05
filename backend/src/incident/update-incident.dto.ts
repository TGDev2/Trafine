import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsLatitude,
  IsLongitude,
  Min,
  Max,
} from 'class-validator';
import { Sanitize } from 'class-sanitizer';

export class UpdateIncidentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  type?: string;

  @IsOptional()
  @IsString()
  @Sanitize((value: string) => value)
  description?: string;

  @IsOptional()
  @IsLatitude()
  @Min(41.0, {
    message: 'La latitude doit être ≥ 41.0 (France métropolitaine)',
  })
  @Max(51.0, {
    message: 'La latitude doit être ≤ 51.0 (France métropolitaine)',
  })
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  @Min(-5.0, {
    message: 'La longitude doit être ≥ -5.0 (France métropolitaine)',
  })
  @Max(9.0, { message: 'La longitude doit être ≤ 9.0 (France métropolitaine)' })
  longitude?: number;
}
