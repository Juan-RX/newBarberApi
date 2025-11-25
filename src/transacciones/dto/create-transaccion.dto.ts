import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransaccionDto {
  @ApiProperty({ description: 'ID de la venta asociada', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  ventaId: number;

  @ApiProperty({ description: 'Código de negocio', example: 'BAR01' })
  @IsString()
  @IsNotEmpty()
  codigoNegocio: string;

  @ApiProperty({ description: 'ID externo de la transacción', example: 'TXN-EXT-12345' })
  @IsString()
  @IsNotEmpty()
  transaccionExternaId: string;

  @ApiProperty({ description: 'Tipo de operación', example: 'COMPRA', default: 'COMPRA' })
  @IsString()
  @IsOptional()
  tipoOperacion?: string;

  @ApiProperty({ description: 'Monto de la transacción', example: 150.00 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  monto: number;

  @ApiProperty({ description: 'Moneda', example: 'MXN', default: 'MXN' })
  @IsString()
  @IsOptional()
  moneda?: string;

  @ApiProperty({ description: 'Descripción de la transacción', example: 'Pago de servicio de corte', required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ description: 'Medio de pago', example: 'TARJETA', default: 'TARJETA' })
  @IsString()
  @IsOptional()
  medioPago?: string;

  @ApiProperty({ description: 'ID del estado de transacción', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  estadoTxId: number;

  @ApiProperty({ description: 'Número de intentos', example: 1, default: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  intentos?: number;

  @ApiProperty({ description: 'Número de tarjeta enmascarado', example: '****1234', required: false })
  @IsString()
  @IsOptional()
  numeroTarjetaMask?: string;

  @ApiProperty({ description: 'Token de tarjeta', example: 'token-abc123', required: false })
  @IsString()
  @IsOptional()
  tokenTarjeta?: string;

  @ApiProperty({ description: 'Nombre del tarjetahabiente', example: 'Juan Pérez', required: false })
  @IsString()
  @IsOptional()
  nombreTarjetahab?: string;

  @ApiProperty({ description: 'Mes de expiración', example: 12, required: false })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  mesExp?: number;

  @ApiProperty({ description: 'Año de expiración', example: 2025, required: false })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  anioExp?: number;

  @ApiProperty({ description: 'Cuenta origen', example: '1234567890', required: false })
  @IsString()
  @IsOptional()
  ctaOrigen?: string;

  @ApiProperty({ description: 'Cuenta destino', example: '0987654321', required: false })
  @IsString()
  @IsOptional()
  ctaDestino?: string;

  @ApiProperty({ description: 'Código de autorización', example: 'AUTH123', required: false })
  @IsString()
  @IsOptional()
  autorizacion?: string;

  @ApiProperty({ description: 'Payload del banco', example: '{"status":"approved"}', required: false })
  @IsString()
  @IsOptional()
  bancoPayload?: string;
}

