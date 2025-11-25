import { ApiProperty } from '@nestjs/swagger';

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
    description: 'ID de la cita si ya existe una cita reservada (opcional)',
    example: null,
    required: false,
  })
  id_cita?: number | null;

  @ApiProperty({ description: 'ID del barbero disponible', example: 1 })
  id_barbero: number;
}

