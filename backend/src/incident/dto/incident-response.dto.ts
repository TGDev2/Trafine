import { ApiProperty } from '@nestjs/swagger';

export class IncidentResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: 'accident' })
  type!: string;

  @ApiProperty({ required: false, example: 'Dérapage sur l’A6' })
  description?: string;

  @ApiProperty({ example: true })
  confirmed!: boolean;

  @ApiProperty({ example: false })
  denied!: boolean;

  @ApiProperty({ format: 'float', example: 48.8566 })
  latitude!: number;

  @ApiProperty({ format: 'float', example: 2.3522 })
  longitude!: number;

  @ApiProperty({ enum: ['active', 'expired', 'archived'] })
  status!: 'active' | 'expired' | 'archived';
}
