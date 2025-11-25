import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { HorarioService } from './horario.service';
import { CreateHorarioSucursalDto } from './dto/create-horario-sucursal.dto';
import { CreateHorarioBarberoDto } from './dto/create-horario-barbero.dto';
import { CreateExcepcionHorarioDto } from './dto/create-excepcion-horario.dto';
import { HorarioSucursal } from '../entities/horario-sucursal.entity';
import { HorarioBarbero } from '../entities/horario-barbero.entity';
import { ExcepcionHorario } from '../entities/excepcion-horario.entity';
import { PausaBarbero } from '../entities/pausa-barbero.entity';
import { CreatePausaBarberoDto } from './dto/create-pausa-barbero.dto';

@ApiTags('9. Horarios')
@Controller('horarios')
export class HorarioController {
  constructor(private readonly horarioService: HorarioService) {}

  // ========== HORARIOS DE SUCURSAL ==========

  @Post('sucursal')
  @ApiOperation({ summary: 'Crear horario de sucursal' })
  @ApiResponse({ status: 201, description: 'Horario creado exitosamente', type: HorarioSucursal })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createHorarioSucursal(@Body() createDto: CreateHorarioSucursalDto): Promise<HorarioSucursal> {
    return this.horarioService.createHorarioSucursal(createDto);
  }

  @Get('sucursal/:sucursalId')
  @ApiOperation({ summary: 'Obtener horarios de una sucursal' })
  @ApiParam({ name: 'sucursalId', description: 'ID de la sucursal' })
  @ApiResponse({ status: 200, description: 'Lista de horarios', type: [HorarioSucursal] })
  getHorariosSucursal(@Param('sucursalId', ParseIntPipe) sucursalId: number): Promise<HorarioSucursal[]> {
    return this.horarioService.getHorariosSucursal(sucursalId);
  }

  @Get('sucursal/:sucursalId/dia')
  @ApiOperation({
    summary: 'Obtener horario de sucursal para un día específico',
    description: 'Retorna el horario considerando excepciones y horarios especiales. Usa formato de fecha: YYYY-MM-DD (ej: 2024-01-15)',
  })
  @ApiParam({ name: 'sucursalId', description: 'ID de la sucursal', example: 1 })
  @ApiQuery({
    name: 'fecha',
    required: true,
    type: String,
    description: 'Fecha en formato YYYY-MM-DD (ej: 2024-01-15) o ISO string',
    example: '2024-01-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Horario del día (puede ser null si la sucursal está cerrada o no tiene horario)',
    type: HorarioSucursal,
  })
  @ApiResponse({ status: 400, description: 'Fecha inválida' })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  getHorarioSucursalPorDia(
    @Param('sucursalId', ParseIntPipe) sucursalId: number,
    @Query('fecha') fecha: string,
  ) {
    return this.horarioService.getHorarioSucursalPorDia(sucursalId, fecha);
  }

  @Put('sucursal/:id')
  @ApiOperation({ summary: 'Actualizar horario de sucursal' })
  @ApiParam({ name: 'id', description: 'ID del horario' })
  @ApiResponse({ status: 200, description: 'Horario actualizado', type: HorarioSucursal })
  updateHorarioSucursal(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Partial<CreateHorarioSucursalDto>,
  ): Promise<HorarioSucursal> {
    return this.horarioService.updateHorarioSucursal(id, updateDto);
  }

  @Delete('sucursal/:id')
  @ApiOperation({ summary: 'Eliminar horario de sucursal' })
  @ApiParam({ name: 'id', description: 'ID del horario' })
  @ApiResponse({ status: 200, description: 'Horario eliminado' })
  deleteHorarioSucursal(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.horarioService.deleteHorarioSucursal(id);
  }

  // ========== HORARIOS DE BARBERO ==========

  @Post('barbero')
  @ApiOperation({ summary: 'Crear horario de barbero' })
  @ApiResponse({ status: 201, description: 'Horario creado exitosamente', type: HorarioBarbero })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createHorarioBarbero(@Body() createDto: CreateHorarioBarberoDto): Promise<HorarioBarbero> {
    return this.horarioService.createHorarioBarbero(createDto);
  }

  @Get('barbero/:barberoId')
  @ApiOperation({ summary: 'Obtener horarios de un barbero' })
  @ApiParam({ name: 'barberoId', description: 'ID del barbero' })
  @ApiResponse({ status: 200, description: 'Lista de horarios', type: [HorarioBarbero] })
  getHorariosBarbero(@Param('barberoId', ParseIntPipe) barberoId: number): Promise<HorarioBarbero[]> {
    return this.horarioService.getHorariosBarbero(barberoId);
  }

  @Get('barbero/:barberoId/dia')
  @ApiOperation({
    summary: 'Obtener horario de barbero para un día específico',
    description: 'Retorna el horario considerando excepciones y horarios especiales. Usa formato de fecha: YYYY-MM-DD (ej: 2024-01-15)',
  })
  @ApiParam({ name: 'barberoId', description: 'ID del barbero', example: 1 })
  @ApiQuery({
    name: 'fecha',
    required: true,
    type: String,
    description: 'Fecha en formato YYYY-MM-DD (ej: 2024-01-15) o ISO string',
    example: '2024-01-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Horario del día (puede ser null si el barbero está ausente o no tiene horario)',
    type: HorarioBarbero,
  })
  @ApiResponse({ status: 400, description: 'Fecha inválida' })
  @ApiResponse({ status: 404, description: 'Barbero no encontrado' })
  getHorarioBarberoPorDia(
    @Param('barberoId', ParseIntPipe) barberoId: number,
    @Query('fecha') fecha: string,
  ) {
    return this.horarioService.getHorarioBarberoPorDia(barberoId, fecha);
  }

  @Put('barbero/:id')
  @ApiOperation({ summary: 'Actualizar horario de barbero' })
  @ApiParam({ name: 'id', description: 'ID del horario' })
  @ApiResponse({ status: 200, description: 'Horario actualizado', type: HorarioBarbero })
  updateHorarioBarbero(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Partial<CreateHorarioBarberoDto>,
  ): Promise<HorarioBarbero> {
    return this.horarioService.updateHorarioBarbero(id, updateDto);
  }

  @Delete('barbero/:id')
  @ApiOperation({ summary: 'Eliminar horario de barbero' })
  @ApiParam({ name: 'id', description: 'ID del horario' })
  @ApiResponse({ status: 200, description: 'Horario eliminado' })
  deleteHorarioBarbero(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.horarioService.deleteHorarioBarbero(id);
  }

  // ========== EXCEPCIONES ==========

  @Post('excepcion')
  @ApiOperation({ summary: 'Crear excepción de horario (vacaciones, cierres, horarios especiales)' })
  @ApiResponse({ status: 201, description: 'Excepción creada exitosamente', type: ExcepcionHorario })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createExcepcion(@Body() createDto: CreateExcepcionHorarioDto): Promise<ExcepcionHorario> {
    return this.horarioService.createExcepcion(createDto);
  }

  @Get('excepcion')
  @ApiOperation({ summary: 'Obtener excepciones de horario' })
  @ApiQuery({ name: 'sucursalId', required: false, type: Number, description: 'Filtrar por sucursal' })
  @ApiQuery({ name: 'barberoId', required: false, type: Number, description: 'Filtrar por barbero' })
  @ApiQuery({ name: 'fechaInicio', required: false, type: String, description: 'Fecha de inicio para filtrar' })
  @ApiQuery({ name: 'fechaFin', required: false, type: String, description: 'Fecha de fin para filtrar' })
  @ApiResponse({ status: 200, description: 'Lista de excepciones', type: [ExcepcionHorario] })
  getExcepciones(
    @Query('sucursalId') sucursalId?: string,
    @Query('barberoId') barberoId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ): Promise<ExcepcionHorario[]> {
    const sucursalIdNum = sucursalId ? parseInt(sucursalId) : undefined;
    const barberoIdNum = barberoId ? parseInt(barberoId) : undefined;
    return this.horarioService.getExcepciones(sucursalIdNum, barberoIdNum, fechaInicio, fechaFin);
  }

  @Put('excepcion/:id')
  @ApiOperation({ summary: 'Actualizar excepción de horario' })
  @ApiParam({ name: 'id', description: 'ID de la excepción' })
  @ApiResponse({ status: 200, description: 'Excepción actualizada', type: ExcepcionHorario })
  updateExcepcion(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Partial<CreateExcepcionHorarioDto>,
  ): Promise<ExcepcionHorario> {
    return this.horarioService.updateExcepcion(id, updateDto);
  }

  @Delete('excepcion/:id')
  @ApiOperation({ summary: 'Eliminar excepción de horario' })
  @ApiParam({ name: 'id', description: 'ID de la excepción' })
  @ApiResponse({ status: 200, description: 'Excepción eliminada' })
  deleteExcepcion(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.horarioService.deleteExcepcion(id);
  }

  // ========== PAUSAS DE BARBERO ==========

  @Post('pausa')
  @ApiOperation({ summary: 'Crear pausa de barbero (descansos, comida, etc.)' })
  @ApiResponse({ status: 201, description: 'Pausa creada exitosamente', type: PausaBarbero })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createPausa(@Body() createDto: CreatePausaBarberoDto): Promise<PausaBarbero> {
    return this.horarioService.createPausa(createDto);
  }

  @Get('pausa/barbero/:barberoId')
  @ApiOperation({ summary: 'Obtener pausas de un barbero' })
  @ApiParam({ name: 'barberoId', description: 'ID del barbero' })
  @ApiQuery({ name: 'diaSemana', required: false, type: Number, description: 'Filtrar por día de la semana (1-7)' })
  @ApiResponse({ status: 200, description: 'Lista de pausas', type: [PausaBarbero] })
  getPausasBarbero(
    @Param('barberoId', ParseIntPipe) barberoId: number,
    @Query('diaSemana') diaSemana?: string,
  ): Promise<PausaBarbero[]> {
    const diaSemanaNum = diaSemana ? parseInt(diaSemana) : undefined;
    return this.horarioService.getPausasBarbero(barberoId, diaSemanaNum);
  }

  @Put('pausa/:id')
  @ApiOperation({ summary: 'Actualizar pausa de barbero' })
  @ApiParam({ name: 'id', description: 'ID de la pausa' })
  @ApiResponse({ status: 200, description: 'Pausa actualizada', type: PausaBarbero })
  updatePausa(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Partial<CreatePausaBarberoDto>,
  ): Promise<PausaBarbero> {
    return this.horarioService.updatePausa(id, updateDto);
  }

  @Delete('pausa/:id')
  @ApiOperation({ summary: 'Eliminar pausa de barbero' })
  @ApiParam({ name: 'id', description: 'ID de la pausa' })
  @ApiResponse({ status: 200, description: 'Pausa eliminada' })
  deletePausa(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.horarioService.deletePausa(id);
  }
}

