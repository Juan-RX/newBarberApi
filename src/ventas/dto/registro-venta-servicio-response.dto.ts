import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de respuesta para registro de venta de servicio desde el mall
 * Formato esperado por el sistema del centro comercial (Interface 11 - REG_VTA_SERV Response)
 */
export class RegistroVentaServicioResponseDto {
  @ApiProperty({
    description: 'ID de la venta (generado automáticamente)',
    example: 123,
  })
  id: number;

  @ApiProperty({
    description: 'ID del usuario/cliente',
    example: 1,
  })
  user_id: number;

  @ApiProperty({
    description: 'ID de la tienda/sucursal',
    example: 1,
  })
  store_id: number;

  @ApiProperty({
    description: 'ID externo del servicio',
    example: 'SRV-EXT-001',
  })
  service_external_id: string;

  @ApiProperty({
    description: 'Nombre del servicio (del request o del servicio en BD)',
    example: 'Corte de cabello',
    required: false,
  })
  service_name?: string;

  @ApiProperty({
    description: 'Descripción del servicio (del request o del servicio en BD)',
    example: 'Corte de cabello profesional',
    required: false,
  })
  service_description?: string;

  @ApiProperty({
    description: 'Precio del servicio',
    example: 150,
  })
  service_price: number;

  @ApiProperty({
    description: 'Fecha de la cita (formato YYYY-MM-DD, extraída de appointment_time)',
    example: '2024-01-15',
    required: false,
  })
  apointment_date?: string;

  @ApiProperty({
    description: 'Hora de la cita (formato ISO 8601, extraída de appointment_time)',
    example: '2024-01-15T10:00:00Z',
    required: false,
  })
  apointment_time?: string;

  @ApiProperty({
    description: 'Duración del servicio en minutos (obtenida del servicio en BD)',
    example: 30,
  })
  duration_minutes: number;

  @ApiProperty({
    description: 'Estado del pago (PENDIENTE, PAGADA, CANCELADA, etc.) - obtenido del estado de venta',
    example: 'PENDIENTE',
  })
  payment_status: string;

  @ApiProperty({
    description: 'Método de pago (TARJETA, EFECTIVO, etc.) - del request o de transacciones, null si no hay',
    example: 'TARJETA',
    required: false,
    nullable: true,
  })
  payment_method?: string | null;

  @ApiProperty({
    description: 'Código de confirmación único (generado automáticamente)',
    example: 'CONF-123-1705312800000',
  })
  confirmation_code: string;

  @ApiProperty({
    description: 'Fecha de creación de la venta (generada automáticamente)',
    example: '2024-01-15T10:00:00Z',
  })
  created_at: string;
}

