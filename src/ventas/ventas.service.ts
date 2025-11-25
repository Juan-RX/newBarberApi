import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Venta } from '../entities/venta.entity';
import { VentaLinea } from '../entities/venta-linea.entity';
import { Cliente } from '../entities/cliente.entity';
import { Sucursal } from '../entities/sucursal.entity';
import { CatEstadoVenta } from '../entities/catestadoventa.entity';
import { Servicio } from '../entities/servicio.entity';
import { Producto } from '../entities/producto.entity';
import { Cita } from '../entities/cita.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { CreateRegistroVentaServicioDto } from './dto/create-registro-venta-servicio.dto';
import { RegistroVentaServicioResponseDto } from './dto/registro-venta-servicio-response.dto';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private ventaRepository: Repository<Venta>,
    @InjectRepository(VentaLinea)
    private ventaLineaRepository: Repository<VentaLinea>,
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
    @InjectRepository(Sucursal)
    private sucursalRepository: Repository<Sucursal>,
    @InjectRepository(CatEstadoVenta)
    private estadoVentaRepository: Repository<CatEstadoVenta>,
    @InjectRepository(Servicio)
    private servicioRepository: Repository<Servicio>,
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
    @InjectRepository(Cita)
    private citaRepository: Repository<Cita>,
    private dataSource: DataSource,
  ) {}

  async findAllVentas(sucursalId?: number, clienteId?: number): Promise<Venta[]> {
    const where: any = {};
    if (sucursalId) where.sucursalId = sucursalId;
    if (clienteId) where.clienteId = clienteId;

    const ventas = await this.ventaRepository.find({
      where,
      relations: ['cliente', 'sucursal', 'estadoVenta', 'ventaLineas', 'ventaLineas.servicio', 'ventaLineas.producto'],
      order: { createdAt: 'DESC' },
    });

    // Limpiar respuestas
    return ventas.map((venta) => this.limpiarRespuestaVenta(venta));
  }

  async findVentaById(id: number): Promise<Venta> {
    const venta = await this.ventaRepository.findOne({
      where: { ventaId: id },
      relations: ['cliente', 'sucursal', 'estadoVenta', 'ventaLineas', 'ventaLineas.servicio', 'ventaLineas.producto', 'ventaLineas.cita'],
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    return this.limpiarRespuestaVenta(venta);
  }

  async updateVenta(id: number, updateData: Partial<CreateVentaDto>): Promise<Venta> {
    await this.findVentaById(id);

    if (updateData.estadoVentaId) {
      const estadoVenta = await this.estadoVentaRepository.findOne({
        where: { estadoVentaId: updateData.estadoVentaId },
      });
      if (!estadoVenta) {
        throw new NotFoundException(`Estado de venta con ID ${updateData.estadoVentaId} no encontrado`);
      }
    }

    await this.ventaRepository.update(id, updateData);
    const ventaActualizada = await this.ventaRepository.findOne({
      where: { ventaId: id },
      relations: ['cliente', 'sucursal', 'estadoVenta', 'ventaLineas', 'ventaLineas.servicio', 'ventaLineas.producto', 'ventaLineas.cita'],
    });

    if (!ventaActualizada) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    return this.limpiarRespuestaVenta(ventaActualizada);
  }

  /**
   * Registra una venta de servicio usando el formato REG_VTA_SERV (basado en la imagen proporcionada)
   * Este método busca el servicio por código externo y crea la venta automáticamente
   */
  async registrarVentaServicio(registroDto: CreateRegistroVentaServicioDto): Promise<RegistroVentaServicioResponseDto> {
    // 1. Buscar el servicio por código externo
    const servicio = await this.servicioRepository.findOne({
      where: { codigoExterno: registroDto.service_external_id },
    });

    if (!servicio) {
      throw new NotFoundException(
        `Servicio con código externo "${registroDto.service_external_id}" no encontrado`,
      );
    }

    // Validar que el servicio esté activo
    if (!servicio.activo) {
      throw new BadRequestException(`El servicio con código externo "${registroDto.service_external_id}" no está activo`);
    }

    // 2. Validar cliente (user_id)
    const cliente = await this.clienteRepository.findOne({
      where: { clienteId: registroDto.user_id },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${registroDto.user_id} no encontrado`);
    }

    // 3. Validar sucursal (store_id)
    const sucursal = await this.sucursalRepository.findOne({
      where: { sucursalId: registroDto.store_id },
    });

    if (!sucursal) {
      throw new NotFoundException(`Sucursal con ID ${registroDto.store_id} no encontrada`);
    }

    // Validar que el servicio pertenezca a la sucursal (si está asignado)
    if (servicio.storeId && servicio.storeId !== registroDto.store_id) {
      throw new BadRequestException(
        `El servicio "${registroDto.service_external_id}" no está disponible en la sucursal ${registroDto.store_id}`,
      );
    }

    // 4. Obtener estado de venta por defecto si no se proporciona
    let estadoVentaId = registroDto.estado_venta_id;
    // Si es 0, undefined o null, buscar estado por defecto
    if (!estadoVentaId || estadoVentaId === 0) {
      // Buscar estado por defecto (generalmente el primero o con código 'PENDIENTE')
      const estadoDefault = await this.estadoVentaRepository.findOne({
        where: { codigo: 'PENDIENTE' },
      });
      if (!estadoDefault) {
        // Si no existe PENDIENTE, tomar el primero disponible
        const primerEstado = await this.estadoVentaRepository.find({ take: 1 });
        if (primerEstado.length === 0) {
          throw new BadRequestException('No hay estados de venta configurados en el sistema');
        }
        estadoVentaId = primerEstado[0].estadoVentaId;
      } else {
        estadoVentaId = estadoDefault.estadoVentaId;
      }
    } else {
      // Validar que el estado proporcionado exista
      const estadoVenta = await this.estadoVentaRepository.findOne({
        where: { estadoVentaId },
      });
      if (!estadoVenta) {
        throw new NotFoundException(`Estado de venta con ID ${estadoVentaId} no encontrado`);
      }
    }

    // 5. Generar order_code automáticamente (SIEMPRE se genera, no se acepta del request)
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    let orderCode = `ORD-${timestamp}-${random}`;
    
    // Asegurar que el orderCode generado sea único (reintentar si existe)
    let intentos = 0;
    while (intentos < 10) {
      const ventaExistente = await this.ventaRepository.findOne({
        where: { orderCode },
      });
      if (!ventaExistente) {
        break; // El código es único, continuar
      }
      // Si existe, generar uno nuevo
      const nuevoTimestamp = Date.now();
      const nuevoRandom = Math.floor(Math.random() * 1000);
      orderCode = `ORD-${nuevoTimestamp}-${nuevoRandom}`;
      intentos++;
    }

    // 6. Procesar appointment_time
    // Si se proporciona apointment_date pero no apointment_time, usar la fecha con hora 00:00:00
    // Si se proporciona apointment_time, usarlo directamente
    let appointmentTime: Date | undefined;
    if (registroDto.apointment_time) {
      appointmentTime = new Date(registroDto.apointment_time);
      if (isNaN(appointmentTime.getTime())) {
        throw new BadRequestException('El formato de apointment_time no es válido');
      }
    } else if (registroDto.apointment_date) {
      // Si solo se proporciona la fecha, usar medianoche de esa fecha
      appointmentTime = new Date(`${registroDto.apointment_date}T00:00:00`);
      if (isNaN(appointmentTime.getTime())) {
        throw new BadRequestException('El formato de apointment_date no es válido');
      }
    }

    // 7. Usar precio del servicio si no se proporciona o validar que coincida
    const precioServicio = Number(servicio.precio);
    const precioProporcionado = registroDto.service_price;
    
    // Advertencia si los precios no coinciden, pero usar el proporcionado
    if (Math.abs(precioServicio - precioProporcionado) > 0.01) {
      // Los precios no coinciden, pero permitimos continuar usando el precio proporcionado
      // En producción podrías querer lanzar una excepción o registrar una advertencia
    }

    // 9. Calcular totales
    const quantity = registroDto.quantity || 1;
    const discountAmount = registroDto.discount_amount || 0;
    const totalBruto = precioProporcionado * quantity;
    const totalNeto = totalBruto - discountAmount;

    // 10. Asegurar que orderCode siempre tenga un valor válido
    if (!orderCode || (typeof orderCode === 'string' && orderCode.trim() === '')) {
      // Si por alguna razón orderCode no tiene valor, generarlo nuevamente
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      orderCode = `ORD-${timestamp}-${random}`;
    }

    // 11. Crear venta y línea en una transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Crear la venta
      const venta = queryRunner.manager.create(Venta, {
        orderCode,
        clienteId: registroDto.user_id,
        sucursalId: registroDto.store_id,
        estadoVentaId,
        totalBruto,
        descuentoTotal: discountAmount,
        totalNeto,
        origen: registroDto.origen || 'MALL',
        comentarios: registroDto.comentarios,
      });

      const ventaGuardada = await queryRunner.manager.save(venta);

      // Crear la línea de venta
      const priceTotal = totalNeto;

      const ventaLinea = queryRunner.manager.create(VentaLinea, {
        ventaId: ventaGuardada.ventaId,
        tipoItem: 'SERVICIO',
        servicioId: servicio.servicioId,
        quantity,
        priceUnit: precioProporcionado,
        discountAmount,
        priceTotal,
        serviceExternalId: registroDto.service_external_id,
        appointmentTime,
        // Los campos service_name, service_description, duration no se guardan directamente
        // pero están disponibles en la relación con el servicio
      });

      await queryRunner.manager.save(ventaLinea);

      await queryRunner.commitTransaction();

      // Retornar venta con relaciones completas
      const ventaCompleta = await this.ventaRepository.findOne({
        where: { ventaId: ventaGuardada.ventaId },
        relations: [
          'cliente',
          'sucursal',
          'estadoVenta',
          'ventaLineas',
          'ventaLineas.servicio',
          'ventaLineas.producto',
          'ventaLineas.cita',
          'transacciones',
          'transacciones.estadoTx',
        ],
      });

      if (!ventaCompleta) {
        throw new NotFoundException('Error al recuperar la venta creada');
      }

      // Transformar a formato de respuesta del mall
      return this.transformarVentaARespuestaMall(ventaCompleta, registroDto);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Crea una venta usando IDs internos (flujo local)
   */
  async createVenta(createVentaDto: CreateVentaDto): Promise<Venta> {
    const { orderCode, clienteId, sucursalId, estadoVentaId, ventaLineas } = createVentaDto;

    // Validar unicidad del orderCode
    const ventaExistente = await this.ventaRepository.findOne({ where: { orderCode } });
    if (ventaExistente) {
      throw new BadRequestException(`Ya existe una venta con el código ${orderCode}`);
    }

    // Validar cliente (opcional)
    if (clienteId) {
      const cliente = await this.clienteRepository.findOne({ where: { clienteId } });
      if (!cliente) {
        throw new NotFoundException(`Cliente con ID ${clienteId} no encontrado`);
      }
    }

    // Validar sucursal
    const sucursal = await this.sucursalRepository.findOne({ where: { sucursalId } });
    if (!sucursal) {
      throw new NotFoundException(`Sucursal con ID ${sucursalId} no encontrada`);
    }

    // Validar estado de venta
    const estadoVenta = await this.estadoVentaRepository.findOne({ where: { estadoVentaId } });
    if (!estadoVenta) {
      throw new NotFoundException(`Estado de venta con ID ${estadoVentaId} no encontrado`);
    }

    if (!ventaLineas || ventaLineas.length === 0) {
      throw new BadRequestException('La venta debe contener al menos una línea');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalBruto = createVentaDto.totalBruto ?? 0;
      let descuentoTotal = createVentaDto.descuentoTotal ?? 0;
      let totalNeto = createVentaDto.totalNeto ?? 0;

      const lineasPreparadas: Partial<VentaLinea>[] = [];

      for (const linea of ventaLineas) {
        if (linea.tipoItem === 'SERVICIO') {
          if (!linea.servicioId) {
            throw new BadRequestException('servicioId es obligatorio cuando tipoItem es SERVICIO');
          }
          const servicio = await this.servicioRepository.findOne({
            where: { servicioId: linea.servicioId },
          });
          if (!servicio) {
            throw new NotFoundException(`Servicio con ID ${linea.servicioId} no encontrado`);
          }
          lineasPreparadas.push({
            tipoItem: 'SERVICIO',
            servicioId: servicio.servicioId,
            quantity: linea.quantity || 1,
            priceUnit: linea.priceUnit,
            discountAmount: linea.discountAmount || 0,
            priceTotal: (linea.priceUnit - (linea.discountAmount || 0)) * (linea.quantity || 1),
            serviceExternalId: linea.serviceExternalId,
            appointmentTime: linea.appointmentTime ? new Date(linea.appointmentTime) : undefined,
          });
        } else {
          if (!linea.productoId) {
            throw new BadRequestException('productoId es obligatorio cuando tipoItem es PRODUCTO');
          }
          const producto = await this.productoRepository.findOne({
            where: { productoId: linea.productoId },
          });
          if (!producto) {
            throw new NotFoundException(`Producto con ID ${linea.productoId} no encontrado`);
          }
          lineasPreparadas.push({
            tipoItem: 'PRODUCTO',
            productoId: producto.productoId,
            quantity: linea.quantity || 1,
            priceUnit: linea.priceUnit,
            discountAmount: linea.discountAmount || 0,
            priceTotal: (linea.priceUnit - (linea.discountAmount || 0)) * (linea.quantity || 1),
            productExternalId: linea.productExternalId,
            size: linea.size,
            color: linea.color,
            options: linea.options,
          });
        }

        totalBruto += (linea.priceUnit || 0) * (linea.quantity || 1);
        descuentoTotal += linea.discountAmount || 0;
      }

      totalNeto = totalBruto - descuentoTotal;

      const venta = queryRunner.manager.create(Venta, {
        orderCode,
        clienteId,
        sucursalId,
        estadoVentaId,
        totalBruto,
        descuentoTotal,
        totalNeto,
        origen: createVentaDto.origen || 'LOCAL',
        comentarios: createVentaDto.comentarios,
      });

      const ventaGuardada = await queryRunner.manager.save(venta);

      for (const linea of lineasPreparadas) {
        const ventaLinea = queryRunner.manager.create(VentaLinea, {
          ...linea,
          ventaId: ventaGuardada.ventaId,
        });
        await queryRunner.manager.save(ventaLinea);
      }

      await queryRunner.commitTransaction();

      const ventaCompleta = await this.ventaRepository.findOne({
        where: { ventaId: ventaGuardada.ventaId },
        relations: [
          'cliente',
          'sucursal',
          'estadoVenta',
          'ventaLineas',
          'ventaLineas.servicio',
          'ventaLineas.producto',
          'ventaLineas.cita',
        ],
      });

      return this.limpiarRespuestaVenta(ventaCompleta);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Limpia la respuesta de venta excluyendo campos no deseados
   * Excluye: size, color, options de ventaLineas y talla, color, stock del servicio
   */
  private limpiarRespuestaVenta(venta: Venta): Venta {
    if (!venta) return venta;

    // Convertir a objeto plano y eliminar campos no deseados
    const ventaLimpia = JSON.parse(JSON.stringify(venta));

    // Limpiar ventaLineas
    if (ventaLimpia.ventaLineas && ventaLimpia.ventaLineas.length > 0) {
      ventaLimpia.ventaLineas = ventaLimpia.ventaLineas.map((linea: any) => {
        // Eliminar campos no deseados de la línea
        delete linea.size;
        delete linea.color;
        delete linea.options;
        
        // Limpiar servicio si existe
        if (linea.servicio) {
          delete linea.servicio.talla;
          delete linea.servicio.color;
          delete linea.servicio.stock;
        }

        // Limpiar producto si existe (también puede tener talla, color)
        if (linea.producto) {
          delete linea.producto.talla;
          delete linea.producto.color;
        }

        return linea;
      });
    }

    if (ventaLimpia.transacciones && ventaLimpia.transacciones.length > 0) {
      ventaLimpia.transacciones = ventaLimpia.transacciones.map((transaccion: any) => {
        delete transaccion.tokenTarjeta;
        delete transaccion.cvvHash;
        delete transaccion.ctaOrigen;
        delete transaccion.ctaDestino;
        delete transaccion.bancoPayload;
        return transaccion;
      });
    }

    return ventaLimpia as Venta;
  }

  /**
   * Transforma una venta a formato de respuesta esperado por el mall
   */
  private transformarVentaARespuestaMall(
    venta: Venta,
    registroDto?: CreateRegistroVentaServicioDto,
  ): RegistroVentaServicioResponseDto {
    // Obtener la primera línea de venta (servicio)
    const ventaLinea = venta.ventaLineas?.[0];
    if (!ventaLinea) {
      throw new BadRequestException('La venta no tiene líneas asociadas');
    }

    const servicio = ventaLinea.servicio;
    if (!servicio) {
      throw new BadRequestException('La línea de venta no tiene servicio asociado');
    }

    // Generar confirmation_code
    const confirmationCode = `CONF-${venta.ventaId}-${Date.now()}`;

    // Obtener payment_method: primero del request, luego de transacciones
    let paymentMethod: string | null = null;
    
    // Si viene en el request, usarlo directamente
    if (registroDto?.payment_method) {
      paymentMethod = registroDto.payment_method;
    } else if (venta.transacciones && venta.transacciones.length > 0) {
      // Si no viene en el request, obtener de la transacción más reciente
      const transaccionesOrdenadas = [...venta.transacciones].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      const transaccionMasReciente = transaccionesOrdenadas[0];
      paymentMethod = transaccionMasReciente.medioPago || null;
    }

    // Formatear appointment_date y appointment_time
    let apointmentDate: string | undefined;
    let apointmentTime: string | undefined;
    
    if (ventaLinea.appointmentTime) {
      const appointmentDateObj = new Date(ventaLinea.appointmentTime);
      // Formatear fecha como YYYY-MM-DD
      apointmentDate = appointmentDateObj.toISOString().split('T')[0];
      // Formatear hora como ISO 8601
      apointmentTime = appointmentDateObj.toISOString();
    }

    // Formatear created_at como ISO 8601
    const createdAt = venta.createdAt.toISOString();

    // Obtener payment_status del estado de venta
    const paymentStatus = venta.estadoVenta?.codigo || 'PENDIENTE';

    // Obtener duration_minutes del servicio
    const durationMinutes = servicio.duracionMinutos || 0;

    // Obtener service_name y service_description: primero del request, luego del servicio
    const serviceName = registroDto?.service_name || servicio.nombre || undefined;
    const serviceDescription = registroDto?.service_description || servicio.descripcion || undefined;

    return {
      id: venta.ventaId,
      user_id: venta.clienteId || 0,
      store_id: venta.sucursalId,
      service_external_id: ventaLinea.serviceExternalId || '',
      service_name: serviceName,
      service_description: serviceDescription,
      service_price: Number(ventaLinea.priceUnit),
      apointment_date: apointmentDate,
      apointment_time: apointmentTime,
      duration_minutes: durationMinutes,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      confirmation_code: confirmationCode,
      created_at: createdAt,
    };
  }
}

