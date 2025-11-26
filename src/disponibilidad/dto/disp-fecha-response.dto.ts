import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de respuesta de disponibilidad de fechas para el mall (Interface 10 - DISP_FECHA)
 * Según matriz de conexiones: servicio_id, fecha_inicio, fecha_fin, duracion_minutos, appointment_time, id_cita, id_bar
 */
export class DispFechaResponseDto {
  @ApiProperty({ description: 'ID del servicio', example: 1 })
  servicio_id: number;

  @ApiProperty({
    description: 'Fecha y hora de inicio del slot disponible',
    example: '2024-12-23 09:00',
  })
  fecha_inicio: string;

  @ApiProperty({
    description: 'Fecha y hora de fin del slot disponible',
    example: '2024-12-23 09:30',
  })
  fecha_fin: string;

  @ApiProperty({ description: 'Duración en minutos', example: 30 })
  duracion_minutos: number;

  @ApiProperty({
    description: 'Hora de la cita (appointment_time)',
    example: '09:00',
  })
  appointment_time: string;

  @ApiProperty({
    description: 'ID de la cita si ya existe una cita reservada (opcional)',
    example: null,
    required: false,
  })
  id_cita?: number | null;

  @ApiProperty({ description: 'ID del barbero disponible (id_bar)', example: 1 })
  id_bar: number;
}

