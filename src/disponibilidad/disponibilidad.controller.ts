import { Controller, Get, Post, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DisponibilidadService } from './disponibilidad.service';
import { CheckDisponibilidadDto } from './dto/check-disponibilidad.dto';
import { SlotDisponibleDto } from './dto/slot-disponible.dto';
import { SolDispFechaDto } from './dto/sol-disp-fecha.dto';
import { DispFechaResponseDto } from './dto/disp-fecha-response.dto';
import { parseFechaAmigable } from './utils/date-parser.util';

@Controller('disponibilidad')
export class DisponibilidadController {
  constructor(private readonly disponibilidadService: DisponibilidadService) {}

  @ApiTags('3. Disponibilidad - Interno')
  @Post('check')
  @ApiOperation({
    summary: 'Verificar disponibilidad de citas para un servicio',
    description:
      'Busca slots disponibles para un servicio específico. Acepta fechas en formatos amigables: "2024-12-23", "2024-12-23 09:00", o "2024-12-23T09:00"',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de slots disponibles',
    type: [SlotDisponibleDto],
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 404, description: 'Servicio o barbero no encontrado' })
  checkDisponibilidad(@Body() dto: CheckDisponibilidadDto): Promise<SlotDisponibleDto[]> {
    return this.disponibilidadService.checkDisponibilidad(dto);
  }

  @ApiTags('3. Disponibilidad - Interno')
  @Get('barbero/:barberoId')
  @ApiOperation({
    summary: 'Obtener disponibilidad de un barbero específico',
    description:
      'Retorna slots de disponibilidad del barbero considerando la intersección entre el horario de la sucursal y el horario del barbero. Los slots se generan en intervalos de 30 minutos. Filtra citas existentes y pausas del barbero. Acepta fechas en formatos amigables: "2024-12-23", "2024-12-23 09:00", o "2024-12-23T09:00"',
  })
  @ApiQuery({
    name: 'fechaInicio',
    required: true,
    type: String,
    description: 'Fecha de inicio. Formatos: "2024-12-23", "2024-12-23 09:00", "2024-12-23T09:00"',
    example: '2024-12-23',
  })
  @ApiQuery({
    name: 'fechaFin',
    required: true,
    type: String,
    description: 'Fecha de fin. Formatos: "2024-12-25", "2024-12-25 19:00", "2024-12-25T19:00"',
    example: '2024-12-25',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de slots del barbero',
    type: [SlotDisponibleDto],
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos (fechas inválidas o barbero sin sucursal)' })
  @ApiResponse({ status: 404, description: 'Barbero no encontrado' })
  getDisponibilidadPorBarbero(
    @Param('barberoId', ParseIntPipe) barberoId: number,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
  ): Promise<SlotDisponibleDto[]> {
    // Parsear fechas amigables antes de pasar al servicio
    let fechaInicioParsed = fechaInicio;
    let fechaFinParsed = fechaFin;

    try {
      const fechaInicioDate = parseFechaAmigable(fechaInicio);
      fechaInicioParsed = fechaInicioDate.toISOString();

      const fechaFinDate = parseFechaAmigable(fechaFin);
      // Si solo se proporciona fecha, establecer a fin del día
      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaFin.trim())) {
        fechaFinDate.setHours(23, 59, 59, 999);
      }
      fechaFinParsed = fechaFinDate.toISOString();
    } catch (error) {
      // Si falla el parseo, dejar que el servicio maneje el error
    }

    return this.disponibilidadService.getDisponibilidadPorBarbero(barberoId, fechaInicioParsed, fechaFinParsed);
  }

  // ========== INTERFACES DEL MALL ==========
  @ApiTags('4. Disponibilidad - Mall')
  @Post('sol-disp-fecha')
  @ApiOperation({
    summary: 'Solicitar disponibilidad de fechas del mall (Interface 9 - SOL_DISP_FECHA)',
    description:
      'Endpoint para que el mall solicite disponibilidad de fechas. Recibe store_id, service_external_id, appointment_date (opcional) y appointment_time (opcional). Retorna disponibilidad en formato Interface 10 - DISP_FECHA. Si no se proporciona fecha/hora, busca disponibilidad para los próximos 30 días.',
  })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad de fechas en formato mall (Interface 10 - DISP_FECHA)',
    type: DispFechaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  solicitarDisponibilidadFechaMall(
    @Body() solicitudDto: SolDispFechaDto,
  ): Promise<DispFechaResponseDto> {
    return this.disponibilidadService.solicitarDisponibilidadFechaMall(solicitudDto);
  }
}

