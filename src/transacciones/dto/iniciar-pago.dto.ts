import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IniciarPagoDto {
  @ApiProperty({
    description: 'Código del cliente según el mall o sistema externo',
    example: 'CL-001',
    required: false,
  })
  @IsString()
  @IsOptional()
  codigo_cliente?: string;

  @ApiProperty({
    description: 'Número de tarjeta origen en formato esperado por el banco',
    example: '4111111111111111',
    required: false,
  })
  @IsString()
  @IsOptional()
  numero_tarjeta_origen?: string;

  @ApiProperty({
    description: 'Número de tarjeta o cuenta que se cargará (alias interno)',
    example: '4111111111111111',
    required: false,
  })
  @ValidateIf((o) => !o.numero_tarjeta_origen)
  @IsString()
  @IsNotEmpty()
  numero_cuenta?: string;

  @ApiProperty({
    description: 'Número de tarjeta destino; si no se envía se usa la cuenta configurada',
    example: '5555555555554444',
    required: false,
  })
  @IsString()
  @IsOptional()
  numero_tarjeta_destino?: string;

  @ApiProperty({
    description: 'Nombre del tarjetahabiente',
    example: 'NOMBRE DEL CLIENTE',
  })
  @ValidateIf((o) => !o.nombre_cliente)
  @IsString()
  @IsNotEmpty()
  nombre_tarjetahab?: string;

  @ApiProperty({
    description: 'Nombre del cliente tal y como está registrado con la tarjeta',
    example: 'Juan Pérez',
    required: false,
  })
  @IsString()
  @IsOptional()
  nombre_cliente?: string;

  @ApiProperty({
    description: 'Mes de expiración de la tarjeta',
    example: 12,
  })
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  mes_exp: number;

  @ApiProperty({
    description: 'Año de expiración de la tarjeta',
    example: 2027,
  })
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  anio_exp: number;

  @ApiProperty({
    description: 'Código de seguridad (CVV o CVC)',
    example: '123',
  })
  @IsString()
  @IsNotEmpty()
  cvv: string;

  @ApiProperty({
    description: 'Tipo de operación',
    example: 'COMPRA',
    required: false,
  })
  @IsString()
  @IsOptional()
  tipo?: string;

  @ApiProperty({
    description: 'Moneda a utilizar',
    example: 'MXN',
    required: false,
  })
  @IsString()
  @IsOptional()
  moneda?: string;

  @ApiProperty({
    description: 'Descripción que verá el cliente en el cargo',
    example: 'Corte de cabello en Van Daik',
    required: false,
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    description: 'Monto a cobrar (por defecto se usa el total de la venta)',
    example: 300,
    required: false,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  monto?: number;
}


