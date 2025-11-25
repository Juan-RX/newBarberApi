import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CatalogoService } from './catalogo.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { CreateBarberoDto } from './dto/create-barbero.dto';
import { ServicioMallDto } from './dto/servicio-mall.dto';
import { CatalogoResponseDto } from './dto/catalogo-response.dto';
import { AssignCodigoExternoDto } from './dto/assign-codigo-externo.dto';

@ApiTags('1. Catálogo - Interno')
@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  // ========== SUCURSALES ==========
  @Post('sucursales')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva sucursal' })
  @ApiResponse({ status: 201, description: 'Sucursal creada exitosamente' })
  createSucursal(@Body() createSucursalDto: CreateSucursalDto) {
    return this.catalogoService.createSucursal(createSucursalDto);
  }

  @Get('sucursales')
  @ApiOperation({ summary: 'Obtener todas las sucursales' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean, description: 'Filtrar por estado activo' })
  @ApiResponse({ status: 200, description: 'Lista de sucursales' })
  findAllSucursales(@Query('activo') activo?: string) {
    const activoBool = activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.catalogoService.findAllSucursales(activoBool);
  }

  @Get('sucursales/:id')
  @ApiOperation({ summary: 'Obtener una sucursal por ID' })
  @ApiResponse({ status: 200, description: 'Sucursal encontrada' })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  findSucursalById(@Param('id', ParseIntPipe) id: number) {
    return this.catalogoService.findSucursalById(id);
  }

  @Patch('sucursales/:id')
  @ApiOperation({ summary: 'Actualizar una sucursal' })
  @ApiResponse({ status: 200, description: 'Sucursal actualizada' })
  updateSucursal(@Param('id', ParseIntPipe) id: number, @Body() updateData: Partial<CreateSucursalDto>) {
    return this.catalogoService.updateSucursal(id, updateData);
  }

  // ========== SERVICIOS ==========
  @Post('servicios')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo servicio' })
  @ApiResponse({ status: 201, description: 'Servicio creado exitosamente' })
  createServicio(@Body() createServicioDto: CreateServicioDto) {
    return this.catalogoService.createServicio(createServicioDto);
  }

  @Get('servicios')
  @ApiOperation({ summary: 'Obtener todos los servicios' })
  @ApiQuery({ name: 'sucursalId', required: false, type: Number, description: 'Filtrar por sucursal' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean, description: 'Filtrar por estado activo' })
  @ApiResponse({ status: 200, description: 'Lista de servicios' })
  findAllServicios(
    @Query('sucursalId') sucursalId?: string,
    @Query('activo') activo?: string,
  ) {
    const sucursalIdNum = sucursalId ? parseInt(sucursalId) : undefined;
    const activoBool = activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.catalogoService.findAllServicios(sucursalIdNum, activoBool);
  }

  // ========== SERVICIOS PARA MALL ==========
  // IMPORTANTE: Las rutas más específicas deben ir ANTES de las genéricas
  @ApiTags('2. Catálogo - Mall')
  @Get('servicios/mall')
  @ApiOperation({
    summary: 'Obtener servicios en formato mall',
    description: 'Retorna servicios solo con los campos que el sistema mall espera (excluye codigoExterno y activo)',
  })
  @ApiQuery({ name: 'sucursalId', required: false, type: Number, description: 'Filtrar por sucursal' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean, description: 'Filtrar por estado activo' })
  @ApiResponse({ status: 200, description: 'Lista de servicios en formato mall', type: [ServicioMallDto] })
  findAllServiciosParaMall(
    @Query('sucursalId') sucursalId?: string,
    @Query('activo') activo?: string,
  ): Promise<ServicioMallDto[]> {
    const sucursalIdNum = sucursalId ? parseInt(sucursalId) : undefined;
    const activoBool = activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.catalogoService.findAllServiciosParaMall(sucursalIdNum, activoBool);
  }

  @ApiTags('2. Catálogo - Mall')
  @Get('servicios/mall/:id')
  @ApiOperation({
    summary: 'Obtener un servicio por ID en formato mall',
    description: 'Retorna el servicio solo con los campos que el sistema mall espera',
  })
  @ApiResponse({ status: 200, description: 'Servicio en formato mall', type: ServicioMallDto })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  findServicioParaMallById(@Param('id', ParseIntPipe) id: number): Promise<ServicioMallDto> {
    return this.catalogoService.findServicioParaMallById(id);
  }

  // Rutas con sub-rutas (más específicas) deben ir antes de las genéricas
  @Get('servicios/:id/codigo-externo')
  @ApiOperation({
    summary: 'Verificar si un servicio tiene código externo asignado',
    description: 'Retorna información sobre si el servicio tiene código externo y cuál es',
  })
  @ApiResponse({ status: 200, description: 'Información del código externo' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  verificarCodigoExternoServicio(@Param('id', ParseIntPipe) id: number) {
    return this.catalogoService.verificarCodigoExternoServicio(id);
  }

  @Post('servicios/:id/codigo-externo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Asignar o actualizar el código externo de un servicio',
    description: 'Asigna un código externo a un servicio. Si el código ya está asignado a otro servicio, retorna error.',
  })
  @ApiResponse({ status: 200, description: 'Código externo asignado exitosamente' })
  @ApiResponse({ status: 400, description: 'El código externo ya está asignado a otro servicio' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  asignarCodigoExternoServicio(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AssignCodigoExternoDto,
  ) {
    return this.catalogoService.asignarCodigoExternoServicio(id, body.codigoExterno);
  }

  // Rutas genéricas van al final
  @Get('servicios/:id')
  @ApiOperation({ summary: 'Obtener un servicio por ID' })
  @ApiResponse({ status: 200, description: 'Servicio encontrado' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  findServicioById(@Param('id', ParseIntPipe) id: number) {
    return this.catalogoService.findServicioById(id);
  }

  @Patch('servicios/:id')
  @ApiOperation({ summary: 'Actualizar un servicio' })
  @ApiResponse({ status: 200, description: 'Servicio actualizado' })
  updateServicio(@Param('id', ParseIntPipe) id: number, @Body() updateData: Partial<CreateServicioDto>) {
    return this.catalogoService.updateServicio(id, updateData);
  }

  // ========== INTERFACES DEL MALL ==========
  @ApiTags('2. Catálogo - Mall')
  @Get('solicita-catalogo')
  @ApiOperation({
    summary: 'Solicitar catálogo del mall (Interface 3 - SOLICITA_CATALOGO)',
    description:
      'Endpoint para que el mall solicite el catálogo. El mall no envía datos, solo realiza la solicitud. Retorna catálogo en formato Interface 4 - CATALOGO. Los parámetros store_id y category son opcionales via query params.',
  })
  @ApiQuery({ name: 'store_id', required: false, type: Number, description: 'ID de la sucursal (opcional)' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Categoría de productos/servicios (opcional)' })
  @ApiResponse({
    status: 200,
    description: 'Catálogo en formato mall (Interface 4 - CATALOGO)',
    type: [CatalogoResponseDto],
  })
  solicitarCatalogoMall(
    @Query('store_id') storeId?: string,
    @Query('category') category?: string,
  ): Promise<CatalogoResponseDto[]> {
    const storeIdNum = storeId ? parseInt(storeId) : undefined;
    return this.catalogoService.solicitarCatalogoMall(storeIdNum, category);
  }

  // ========== BARBEROS ==========
  @Post('barberos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo barbero' })
  @ApiResponse({ status: 201, description: 'Barbero creado exitosamente' })
  createBarbero(@Body() createBarberoDto: CreateBarberoDto) {
    return this.catalogoService.createBarbero(createBarberoDto);
  }

  @Get('barberos')
  @ApiOperation({ summary: 'Obtener todos los barberos' })
  @ApiQuery({ name: 'sucursalId', required: false, type: Number, description: 'Filtrar por sucursal' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean, description: 'Filtrar por estado activo' })
  @ApiResponse({ status: 200, description: 'Lista de barberos' })
  findAllBarberos(
    @Query('sucursalId') sucursalId?: string,
    @Query('activo') activo?: string,
  ) {
    const sucursalIdNum = sucursalId ? parseInt(sucursalId) : undefined;
    const activoBool = activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.catalogoService.findAllBarberos(sucursalIdNum, activoBool);
  }

  @Get('barberos/:id')
  @ApiOperation({ summary: 'Obtener un barbero por ID' })
  @ApiResponse({ status: 200, description: 'Barbero encontrado' })
  @ApiResponse({ status: 404, description: 'Barbero no encontrado' })
  findBarberoById(@Param('id', ParseIntPipe) id: number) {
    return this.catalogoService.findBarberoById(id);
  }

  @Patch('barberos/:id')
  @ApiOperation({ summary: 'Actualizar un barbero' })
  @ApiResponse({ status: 200, description: 'Barbero actualizado' })
  updateBarbero(@Param('id', ParseIntPipe) id: number, @Body() updateData: Partial<CreateBarberoDto>) {
    return this.catalogoService.updateBarbero(id, updateData);
  }
}

