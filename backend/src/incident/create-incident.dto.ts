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

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsString()
  @Sanitize((value: string) => value)
  description?: string;

  @IsLatitude()
  @Min(41.0, {
    message: 'La latitude doit être ≥ 41.0 (France métropolitaine)',
  })
  @Max(52.0, {
    message: 'La latitude doit être ≤ 52.0 (France métropolitaine)',
  })
  latitude!: number;

  @IsLongitude()
  @Min(-5.0, {
    message: 'La longitude doit être ≥ -5.0 (France métropolitaine)',
  })
  @Max(9.0, { message: 'La longitude doit être ≤ 9.0 (France métropolitaine)' })
  longitude!: number;
}
