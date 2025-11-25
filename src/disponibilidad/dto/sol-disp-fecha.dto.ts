import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para solicitud de disponibilidad de fechas del mall (Interface 9 - SOL_DISP_FECHA)
 * Formato esperado del mall según especificación
 */
export class SolDispFechaDto {
  @ApiProperty({
    description: 'ID de la sucursal',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  store_id: number;

  @ApiProperty({
    description: 'ID externo del servicio (codigo_externo)',
    example: 'SRV-EXT-001',
  })
  @IsString()
  @IsNotEmpty()
  service_external_id: string;

  @ApiProperty({
    description: 'Fecha de la cita (formato YYYY-MM-DD)',
    example: '2024-12-23',
    required: false,
  })
  @IsString()
  @IsOptional()
  appointment_date?: string;

  @ApiProperty({
    description: 'Hora de la cita (formato HH:mm o ISO 8601)',
    example: '10:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  appointment_time?: string;
}

