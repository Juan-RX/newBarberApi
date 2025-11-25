import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para solicitud de catálogo del mall (Interface 3 - SOLICITA_CATALOGO)
 * Formato esperado del mall según especificación
 */
export class SolicitaCatalogoDto {
  @ApiProperty({
    description: 'ID de la sucursal',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  store_id: number;

  @ApiProperty({
    description: 'Categoría de productos/servicios (opcional)',
    example: 'servicios',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;
}

