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
    example: 'SRV003',
  })
  @IsString()
  @IsNotEmpty()
  service_external_id: string;

  @ApiProperty({
    description: 'Fecha de la cita (formato YYYY-MM-DD)',
    example: '2024-12-23',
  })
  @IsString()
  @IsNotEmpty()
  appointment_date: string;
}

