import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateProductoDto {
  @ApiProperty({ description: 'ID de la sucursal', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  storeId?: number;

  @ApiProperty({ description: 'Nombre del producto', example: 'Gel para cabello' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'Descripción del producto', example: 'Gel fijador profesional', required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ description: 'Categoría del producto', example: 'Cuidado personal', required: false })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiProperty({ description: 'Precio base del producto', example: 250.00 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  precioBase: number;

  @ApiProperty({ description: 'Talla del producto', example: '250ml', required: false })
  @IsString()
  @IsOptional()
  talla?: string;

  @ApiProperty({ description: 'Color del producto', example: 'Transparente', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ description: 'Opciones adicionales', example: 'Sin fragancia', required: false })
  @IsString()
  @IsOptional()
  opciones?: string;

  @ApiProperty({ description: 'Duración en minutos (si aplica)', example: 0, required: false })
  @IsNumber()
  @IsOptional()
  duracionMinutos?: number;

  @ApiProperty({ description: 'SKU interno único', example: 'SKU-GEL-001' })
  @IsString()
  @IsNotEmpty()
  skuInterno: string;

  @ApiProperty({ description: 'ID externo del producto', example: 'PROD-EXT-001', required: false })
  @IsString()
  @IsOptional()
  productExternalId?: string;

  @ApiProperty({ description: 'Estado activo', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

