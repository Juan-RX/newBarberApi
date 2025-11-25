import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosError } from 'axios';
import { createHash } from 'crypto';
import { TransaccionPago } from '../entities/transaccion-pago.entity';
import { Venta } from '../entities/venta.entity';
import { CatEstadoTransaccion } from '../entities/catestadotransaccion.entity';
import { CatEstadoVenta } from '../entities/catestadoventa.entity';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { IniciarPagoDto } from './dto/iniciar-pago.dto';

type BancoEstado = 'APROBADA' | 'PENDIENTE' | 'RECHAZADA';

interface BancoRequestPayload {
  NumeroTarjetaOrigen: string;
  NumeroTarjetaDestino: string;
  NombreCliente: string;
  MesExp: number;
  AnioExp: number;
  Cvv: string;
  Monto: number;
  Moneda?: string;
  Tipo?: string;
  Descripcion?: string;
}

type BancoRequestPayloadWithoutCvv = Omit<BancoRequestPayload, 'Cvv'>;

@Injectable()
export class TransaccionesService {
  private readonly bancoApiUrl = process.env.BANCO_API_URL || 'http://localhost:5000/api/transacciones';
  private readonly bancoCuentaDestino = process.env.BANCO_CTA_DESTINO || '0000000007';
  private readonly bancoTimeoutMs = Number(process.env.BANCO_TIMEOUT_MS ?? 10000);

  constructor(
    @InjectRepository(TransaccionPago)
    private transaccionRepository: Repository<TransaccionPago>,
    @InjectRepository(Venta)
    private ventaRepository: Repository<Venta>,
    @InjectRepository(CatEstadoTransaccion)
    private estadoTxRepository: Repository<CatEstadoTransaccion>,
    @InjectRepository(CatEstadoVenta)
    private estadoVentaRepository: Repository<CatEstadoVenta>,
  ) {}

  async createTransaccion(createTransaccionDto: CreateTransaccionDto): Promise<TransaccionPago> {
    // Validar que la venta existe
    const venta = await this.ventaRepository.findOne({
      where: { ventaId: createTransaccionDto.ventaId },
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${createTransaccionDto.ventaId} no encontrada`);
    }

    // Validar que el estado existe
    const estadoTx = await this.estadoTxRepository.findOne({
      where: { estadoTxId: createTransaccionDto.estadoTxId },
    });

    if (!estadoTx) {
      throw new NotFoundException(`Estado de transacción con ID ${createTransaccionDto.estadoTxId} no encontrado`);
    }

    const transaccion = this.transaccionRepository.create({
      ...createTransaccionDto,
      tipoOperacion: createTransaccionDto.tipoOperacion || 'COMPRA',
      moneda: createTransaccionDto.moneda || 'MXN',
      medioPago: createTransaccionDto.medioPago || 'TARJETA',
      intentos: createTransaccionDto.intentos || 1,
    });

    return await this.transaccionRepository.save(transaccion);
  }

  async findAllTransacciones(ventaId?: number): Promise<TransaccionPago[]> {
    const where = ventaId ? { ventaId } : {};
    return await this.transaccionRepository.find({
      where,
      relations: ['venta', 'estadoTx'],
      order: { createdAt: 'DESC' },
    });
  }

  async findTransaccionById(id: number): Promise<TransaccionPago> {
    const transaccion = await this.transaccionRepository.findOne({
      where: { transaccionId: id },
      relations: ['venta', 'estadoTx'],
    });

    if (!transaccion) {
      throw new NotFoundException(`Transacción con ID ${id} no encontrada`);
    }

    return transaccion;
  }

  async findTransaccionByExternalId(externalId: string): Promise<TransaccionPago> {
    const transaccion = await this.transaccionRepository.findOne({
      where: { transaccionExternaId: externalId },
      relations: ['venta', 'estadoTx'],
    });

    if (!transaccion) {
      throw new NotFoundException(`Transacción con ID externo ${externalId} no encontrada`);
    }

    return transaccion;
  }

  async updateTransaccion(
    id: number,
    updateData: Partial<CreateTransaccionDto>,
  ): Promise<TransaccionPago> {
    await this.findTransaccionById(id);

    if (updateData.estadoTxId) {
      const estadoTx = await this.estadoTxRepository.findOne({
        where: { estadoTxId: updateData.estadoTxId },
      });

      if (!estadoTx) {
        throw new NotFoundException(`Estado de transacción con ID ${updateData.estadoTxId} no encontrado`);
      }
    }

    await this.transaccionRepository.update(id, updateData);
    return this.findTransaccionById(id);
  }

  async getTransaccionesPorVenta(ventaId: number): Promise<TransaccionPago[]> {
    const venta = await this.ventaRepository.findOne({
      where: { ventaId },
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${ventaId} no encontrada`);
    }

    return await this.transaccionRepository.find({
      where: { ventaId },
      relations: ['estadoTx'],
      order: { createdAt: 'DESC' },
    });
  }

  async iniciarPagoVenta(ventaId: number, pagoDto: IniciarPagoDto): Promise<TransaccionPago> {
    const venta = await this.ventaRepository.findOne({
      where: { ventaId },
      relations: ['cliente', 'sucursal', 'ventaLineas', 'ventaLineas.servicio', 'estadoVenta'],
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${ventaId} no encontrada`);
    }

    if (!venta.cliente) {
      throw new BadRequestException('La venta no tiene un cliente asociado');
    }

    if (!venta.sucursal) {
      throw new BadRequestException('La venta no tiene una sucursal asociada');
    }

    const estadoTransaccionPendiente = await this.findEstadoTransaccionByCodigo('PENDIENTE');
    const numeroTarjetaOrigen = pagoDto.numero_tarjeta_origen ?? pagoDto.numero_cuenta;
    if (!numeroTarjetaOrigen) {
      throw new BadRequestException(
        'Debes proporcionar numero_tarjeta_origen o numero_cuenta para iniciar el pago',
      );
    }

    const numeroTarjetaDestino = pagoDto.numero_tarjeta_destino ?? this.bancoCuentaDestino;

    const nombreCliente =
      pagoDto.nombre_cliente ?? pagoDto.nombre_tarjetahab ?? venta.cliente?.nombre;
    if (!nombreCliente) {
      throw new BadRequestException('No se proporcionó el nombre del tarjetahabiente');
    }

    const monto = Number(pagoDto.monto ?? venta.totalNeto ?? 0);
    const numeroMask = this.maskCardNumber(numeroTarjetaOrigen);
    const numeroDestinoMask = this.maskCardNumber(numeroTarjetaDestino);
    const cvvHash = this.hashCvv(pagoDto.cvv);

    const descripcion =
      pagoDto.descripcion ||
      venta.ventaLineas?.[0]?.servicio?.nombre ||
      venta.ventaLineas?.[0]?.servicio?.descripcion ||
      venta.comentarios ||
      'Servicio en barbería';

    const transaccion = this.transaccionRepository.create({
      ventaId: venta.ventaId,
      codigoNegocio: venta.sucursal.codigoNegocio,
      transaccionExternaId: venta.orderCode,
      tipoOperacion: pagoDto.tipo || 'COMPRA',
      monto,
      moneda: pagoDto.moneda || 'MXN',
      descripcion,
      medioPago: 'TARJETA',
      estadoTxId: estadoTransaccionPendiente.estadoTxId,
      intentos: 1,
      numeroTarjetaMask: numeroMask,
      nombreTarjetahab: nombreCliente,
      mesExp: pagoDto.mes_exp,
      anioExp: pagoDto.anio_exp,
      cvvHash,
      ctaOrigen: numeroMask,
      ctaDestino: numeroDestinoMask,
    });

    const transaccionGuardada = await this.transaccionRepository.save(transaccion);

    const payload = this.construirPayloadBanco({
      numeroTarjetaOrigen,
      numeroTarjetaDestino,
      nombreCliente,
      mesExp: pagoDto.mes_exp,
      anioExp: pagoDto.anio_exp,
      cvv: pagoDto.cvv,
      monto,
      moneda: pagoDto.moneda || 'MXN',
      tipo: pagoDto.tipo || 'COMPRA',
      descripcion,
    });
    const payloadSanitizado = this.sanitizarPayloadBanco(payload);
    let respuestaBanco: any;

    try {
      const response = await axios.post(this.bancoApiUrl, payload, {
        timeout: this.bancoTimeoutMs,
      });
      respuestaBanco = response.data;
    } catch (error) {
      const esErrorAxios = axios.isAxiosError(error);
      const axiosError = error as AxiosError;
      const respuestaError = esErrorAxios ? (axiosError.response?.data as any) : undefined;
      const mensajeError = esErrorAxios
        ? axiosError.message
        : 'Error desconocido al contactar al banco';

      await this.finalizarTransaccionBanco(
        transaccionGuardada.transaccionId,
        'RECHAZADA',
        payloadSanitizado,
        respuestaError ?? { mensaje: mensajeError },
      );
      await this.actualizarEstadoVentaSegunPago(venta.ventaId, 'RECHAZADA');

      throw new BadRequestException({
        message: 'No se pudo completar el pago con el banco',
        detalle: respuestaError?.mensaje ?? respuestaError?.message ?? mensajeError,
        bancoResponse: respuestaError,
      });
    }

    const estadoBanco = this.mapEstadoBanco(respuestaBanco);
    const transaccionExternaId =
      respuestaBanco?.IdTransaccion ??
      respuestaBanco?.id_transaccion ??
      respuestaBanco?.transaccionId ??
      respuestaBanco?.idTransaccion ??
      venta.orderCode;
    const autorizacion =
      respuestaBanco?.NumeroAutorizacion ??
      respuestaBanco?.numeroAutorizacion ??
      respuestaBanco?.autorizacion ??
      respuestaBanco?.codigoAutorizacion;

    await this.finalizarTransaccionBanco(
      transaccionGuardada.transaccionId,
      estadoBanco,
      payloadSanitizado,
      respuestaBanco,
      transaccionExternaId,
      autorizacion,
    );

    await this.actualizarEstadoVentaSegunPago(venta.ventaId, estadoBanco);

    if (estadoBanco === 'RECHAZADA') {
      throw new BadRequestException({
        message: 'El banco rechazó la transacción',
        detalle: respuestaBanco?.mensaje ?? respuestaBanco?.message ?? 'Pago rechazado por el banco',
        bancoResponse: respuestaBanco,
      });
    }

    const transaccionFinal = await this.transaccionRepository.findOne({
      where: { transaccionId: transaccionGuardada.transaccionId },
      relations: ['venta', 'estadoTx'],
    });

    return this.limpiarRespuestaTransaccion(transaccionFinal);
  }

  private limpiarRespuestaTransaccion(transaccion: TransaccionPago | null): TransaccionPago {
    if (!transaccion) {
      return transaccion;
    }

    const copia = JSON.parse(JSON.stringify(transaccion));
    delete copia.cvvHash;
    delete copia.ctaOrigen;
    delete copia.ctaDestino;
    delete copia.tokenTarjeta;
    delete copia.bancoPayload;

    return copia;
  }

  private construirPayloadBanco(datos: {
    numeroTarjetaOrigen: string;
    numeroTarjetaDestino: string;
    nombreCliente: string;
    mesExp: number;
    anioExp: number;
    cvv: string;
    monto: number;
    moneda?: string;
    tipo?: string;
    descripcion?: string;
  }): BancoRequestPayload {
    return {
      NumeroTarjetaOrigen: datos.numeroTarjetaOrigen,
      NumeroTarjetaDestino: datos.numeroTarjetaDestino,
      NombreCliente: datos.nombreCliente,
      MesExp: datos.mesExp,
      AnioExp: datos.anioExp,
      Cvv: datos.cvv,
      Monto: datos.monto,
      Moneda: datos.moneda,
      Tipo: datos.tipo,
      Descripcion: datos.descripcion,
    };
  }

  private sanitizarPayloadBanco(payload: BancoRequestPayload): BancoRequestPayloadWithoutCvv {
    const { Cvv, ...resto } = payload;
    return resto;
  }

  private async finalizarTransaccionBanco(
    transaccionId: number,
    estadoBanco: BancoEstado,
    requestPayload: BancoRequestPayloadWithoutCvv,
    responsePayload: any,
    transaccionExternaId?: string,
    autorizacion?: string,
  ): Promise<void> {
    const estadoTx = await this.findEstadoTransaccionByCodigo(estadoBanco);
    const payloadGuardado = JSON.stringify({
      request: requestPayload,
      response: responsePayload,
    });

    const updateData: Partial<TransaccionPago> = {
      estadoTxId: estadoTx.estadoTxId,
      bancoPayload: payloadGuardado,
      autorizacion,
    };

    if (transaccionExternaId) {
      updateData.transaccionExternaId = transaccionExternaId;
    }

    await this.transaccionRepository.update(transaccionId, updateData);
  }

  private mapEstadoBanco(respuesta: any): BancoEstado {
    const valorEstado =
      respuesta?.NombreEstado ??
      respuesta?.nombre_estado ??
      respuesta?.estado ??
      respuesta?.status ??
      respuesta?.resultado ??
      respuesta?.decision ??
      '';
    const estadoRaw =
      typeof valorEstado === 'string'
        ? valorEstado.toUpperCase()
        : valorEstado?.toString
        ? valorEstado.toString().toUpperCase()
        : '';

    if (
      estadoRaw.includes('APROB') ||
      estadoRaw.includes('COMPLET') ||
      estadoRaw.includes('EXITOS') ||
      estadoRaw === 'SUCCESS' ||
      estadoRaw === 'APPROVED'
    ) {
      return 'APROBADA';
    }

    if (
      estadoRaw.includes('PEND') ||
      estadoRaw === 'EN_PROCESO' ||
      estadoRaw === 'PROCESSING' ||
      estadoRaw === 'PENDING'
    ) {
      return 'PENDIENTE';
    }

    return 'RECHAZADA';
  }

  private async actualizarEstadoVentaSegunPago(
    ventaId: number,
    estadoBanco: BancoEstado,
  ): Promise<void> {
    let codigoEstadoVenta: string | null = null;

    if (estadoBanco === 'APROBADA') {
      codigoEstadoVenta = 'PAGADA';
    } else if (estadoBanco === 'RECHAZADA') {
      codigoEstadoVenta = 'CANCELADA';
    }

    if (!codigoEstadoVenta) {
      return;
    }

    const estadoVentaId = await this.getEstadoVentaIdByCodigo(codigoEstadoVenta);
    if (estadoVentaId) {
      await this.ventaRepository.update(ventaId, { estadoVentaId });
    }
  }

  private async getEstadoVentaIdByCodigo(codigo: string): Promise<number | null> {
    const estadoVenta = await this.estadoVentaRepository.findOne({
      where: { codigo },
    });

    return estadoVenta ? estadoVenta.estadoVentaId : null;
  }

  private async findEstadoTransaccionByCodigo(codigo: string): Promise<CatEstadoTransaccion> {
    const estado = await this.estadoTxRepository.findOne({
      where: { codigo },
    });

    if (!estado) {
      throw new BadRequestException(`No existe un estado de transacción con código ${codigo}`);
    }

    return estado;
  }

  private maskCardNumber(cardNumber: string): string {
    if (!cardNumber) {
      return '';
    }
    const soloDigitos = cardNumber.replace(/\s|-/g, '');
    return soloDigitos.replace(/\d(?=\d{4})/g, '*');
  }

  private hashCvv(cvv: string): Buffer {
    return createHash('sha256').update(cvv).digest();
  }
}

