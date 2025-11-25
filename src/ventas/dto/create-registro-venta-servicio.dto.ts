import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para registrar una venta de servicio basado en el formato REG_VTA_SERV
 * Este formato viene del sistema externo y tiene campos específicos
 */
export class CreateRegistroVentaServicioDto {
  @ApiProperty({
    description: 'ID del usuario/cliente',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  user_id: number;

  @ApiProperty({
    description: 'ID de la tienda/sucursal',
    example: 3,
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
    description: 'Nombre del servicio (opcional, se puede obtener del servicio)',
    example: 'Corte de cabello',
    required: false,
  })
  @IsString()
  @IsOptional()
  service_name?: string;

  @ApiProperty({
    description: 'Descripción del servicio (opcional, se puede obtener del servicio)',
    example: 'Corte de cabello profesional',
    required: false,
  })
  @IsString()
  @IsOptional()
  service_description?: string;

  @ApiProperty({
    description: 'Precio del servicio',
    example: 150,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  service_price: number;

  @ApiProperty({
    description: 'Fecha de la cita (formato YYYY-MM-DD)',
    example: '2024-01-15',
    required: false,
  })
  @IsString()
  @IsOptional()
  apointment_date?: string;

  @ApiProperty({
    description: 'Hora de la cita (formato ISO 8601 o YYYY-MM-DDTHH:mm:ss)',
    example: '2024-01-15T10:00:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  apointment_time?: string;

  @ApiProperty({
    description: 'Duración del servicio en minutos (opcional, se puede obtener del servicio)',
    example: 30,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  duration?: number;

  @ApiProperty({
    description: 'ID del estado de venta (opcional, se usará PENDIENTE por defecto si no se proporciona)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  estado_venta_id?: number;

  @ApiProperty({
    description: 'Cantidad del servicio (default: 1)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  quantity?: number;

  @ApiProperty({
    description: 'Monto de descuento aplicado a la venta (default: 0)',
    example: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  discount_amount?: number;

  @ApiProperty({
    description: 'Origen de la venta (default: MALL)',
    example: 'MALL',
    required: false,
  })
  @IsString()
  @IsOptional()
  origen?: string;

  @ApiProperty({
    description: 'Comentarios adicionales sobre la venta',
    example: 'Cliente regular',
    required: false,
  })
  @IsString()
  @IsOptional()
  comentarios?: string;

  @ApiProperty({
    description: 'Método de pago (TARJETA, EFECTIVO, etc.) - opcional, se retorna en la respuesta',
    example: 'TARJETA',
    required: false,
  })
  @IsString()
  @IsOptional()
  payment_method?: string;
}

