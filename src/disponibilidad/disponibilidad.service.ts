import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Servicio } from '../entities/servicio.entity';
import { Barbero } from '../entities/barbero.entity';
import { Cita } from '../entities/cita.entity';
import { CheckDisponibilidadDto } from './dto/check-disponibilidad.dto';
import { SlotDisponibleDto } from './dto/slot-disponible.dto';
import { HorarioService } from './horario.service';
import { SolDispFechaDto } from './dto/sol-disp-fecha.dto';
import { DispFechaResponseDto } from './dto/disp-fecha-response.dto';
import { parseFechaAmigable } from './utils/date-parser.util';

@Injectable()
export class DisponibilidadService {
  constructor(
    @InjectRepository(Servicio)
    private servicioRepository: Repository<Servicio>,
    @InjectRepository(Barbero)
    private barberoRepository: Repository<Barbero>,
    @InjectRepository(Cita)
    private citaRepository: Repository<Cita>,
    private horarioService: HorarioService,
  ) {}

  async checkDisponibilidad(dto: CheckDisponibilidadDto): Promise<SlotDisponibleDto[]> {
    // Validar que el servicio existe
    const servicio = await this.servicioRepository.findOne({
      where: { servicioId: dto.servicioId },
    });

    if (!servicio) {
      throw new NotFoundException(`Servicio con ID ${dto.servicioId} no encontrado`);
    }

    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);

    if (fechaInicio >= fechaFin) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Obtener barberos disponibles
    let barberos: Barbero[];
    if (dto.barberoId) {
      const barbero = await this.barberoRepository.findOne({
        where: { barberoId: dto.barberoId, sucursalId: dto.sucursalId, activo: true },
      });
      if (!barbero) {
        throw new NotFoundException(`Barbero con ID ${dto.barberoId} no encontrado o no activo en la sucursal`);
      }
      barberos = [barbero];
    } else {
      barberos = await this.barberoRepository.find({
        where: { sucursalId: dto.sucursalId, activo: true },
      });
    }

    if (barberos.length === 0) {
      throw new NotFoundException('No hay barberos disponibles en la sucursal');
    }

    // Optimizar: Obtener citas existentes por barbero para mejor rendimiento
    // Usar consulta optimizada que filtra por barbero y rango de fechas
    const barberoIds = barberos.map((b) => b.barberoId);
    const citasExistentes = await this.citaRepository
      .createQueryBuilder('cita')
      .where('cita.sucursalId = :sucursalId', { sucursalId: dto.sucursalId })
      .andWhere('cita.barberoId IN (:...barberoIds)', { barberoIds })
      .andWhere(
        '(cita.fecha_inicio BETWEEN :fechaInicio AND :fechaFin OR cita.fecha_fin BETWEEN :fechaInicio AND :fechaFin OR (cita.fecha_inicio <= :fechaInicio AND cita.fecha_fin >= :fechaFin))',
        { fechaInicio, fechaFin },
      )
      .select(['cita.citaId', 'cita.barberoId', 'cita.fechaInicio', 'cita.fechaFin'])
      .getMany();

    // Generar slots disponibles
    const slots: SlotDisponibleDto[] = [];
    const duracionMinutos = servicio.duracionMinutos;

    // Generar slots para cada día en el rango
    const fechaActual = new Date(fechaInicio);
    fechaActual.setHours(0, 0, 0, 0);

    // Contador para diagnosticar días sin horarios
    let diasSinHorario = 0;
    const totalDias = Math.ceil((fechaFin.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    while (fechaActual <= fechaFin) {
      // Para cada barbero
      for (const barbero of barberos) {
        // Obtener horario disponible (intersección entre sucursal y barbero)
        const horarioDisponible = await this.horarioService.calcularHorarioDisponible(
          dto.sucursalId,
          barbero.barberoId,
          fechaActual,
        );

        // Si no hay horario disponible, saltar este barbero para este día
        if (!horarioDisponible) {
          diasSinHorario++;
          continue;
        }

        // Obtener pausas del barbero para este día
        const pausas = await this.horarioService.obtenerPausasBarbero(barbero.barberoId, fechaActual);

        // Generar slots del día dentro del horario disponible
        const fechaSlot = new Date(fechaActual);
        fechaSlot.setHours(horarioDisponible.horaInicio, horarioDisponible.minutoInicio, 0, 0);

        const horaFinTotal = horarioDisponible.horaFin * 60 + horarioDisponible.minutoFin;

        while (fechaSlot.getHours() * 60 + fechaSlot.getMinutes() < horaFinTotal) {
          const slotInicio = new Date(fechaSlot);
          const slotFin = new Date(fechaSlot);
          slotFin.setMinutes(slotFin.getMinutes() + duracionMinutos);

          // Verificar que el slot no exceda el horario disponible
          const slotFinTotal = slotFin.getHours() * 60 + slotFin.getMinutes();
          if (slotFinTotal > horaFinTotal) {
            break; // El slot excede el horario, terminar
          }

          // Verificar si el slot está en una pausa
          const slotHoraInicio = slotInicio.getHours();
          const slotMinutoInicio = slotInicio.getMinutes();
          const slotHoraFin = slotFin.getHours();
          const slotMinutoFin = slotFin.getMinutes();

          const enPausa = this.horarioService.verificarSlotEnPausa(
            slotHoraInicio,
            slotMinutoInicio,
            slotHoraFin,
            slotMinutoFin,
            pausas,
          );

          // Verificar si el slot está disponible (no hay cita y no está en pausa)
          const disponible = !enPausa && this.isSlotDisponible(slotInicio, slotFin, barbero.barberoId, citasExistentes);

          slots.push({
            fechaInicio: slotInicio,
            fechaFin: slotFin,
            barberoId: barbero.barberoId,
            barberoNombre: barbero.nombre,
            disponible,
          });

          // Avanzar al siguiente slot (usar duración del servicio como intervalo)
          fechaSlot.setMinutes(fechaSlot.getMinutes() + duracionMinutos);
        }
      }

      // Avanzar al siguiente día
      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    // Si no se generaron slots, proporcionar mensaje útil para diagnóstico
    if (slots.length === 0) {
      // Verificar si hay horarios configurados
      const horariosSucursal = await this.horarioService.getHorariosSucursal(dto.sucursalId);
      const horariosBarbero = await this.horarioService.getHorariosBarbero(barberos[0].barberoId);

      if (horariosSucursal.length === 0) {
        throw new BadRequestException(
          `No hay horarios configurados para la sucursal ${dto.sucursalId}. Configure horarios usando POST /horarios/sucursal`,
        );
      }

      if (horariosBarbero.length === 0) {
        throw new BadRequestException(
          `No hay horarios configurados para el barbero ${barberos[0].barberoId}. Configure horarios usando POST /horarios/barbero`,
        );
      }

      // Si hay horarios pero no se intersectan, informar
      throw new BadRequestException(
        `No se encontraron horarios disponibles en el rango de fechas especificado. Verifique que los horarios de la sucursal y del barbero se intersecten para los días solicitados (${dto.fechaInicio} a ${dto.fechaFin}).`,
      );
    }

    return slots;
  }

  private isSlotDisponible(
    slotInicio: Date,
    slotFin: Date,
    barberoId: number,
    citasExistentes: Cita[],
  ): boolean {
    // Optimización: Filtrar citas del barbero primero para evitar comparaciones innecesarias
    const citasBarbero = citasExistentes.filter((cita) => cita.barberoId === barberoId);

    // Verificar si hay alguna cita que se solape con este slot
    for (const cita of citasBarbero) {
      // Verificar solapamiento
      if (
        (slotInicio >= cita.fechaInicio && slotInicio < cita.fechaFin) ||
        (slotFin > cita.fechaInicio && slotFin <= cita.fechaFin) ||
        (slotInicio <= cita.fechaInicio && slotFin >= cita.fechaFin)
      ) {
        return false;
      }
    }
    return true;
  }

  async getDisponibilidadPorBarbero(
    barberoId: number,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<SlotDisponibleDto[]> {
    const barbero = await this.barberoRepository.findOne({
      where: { barberoId, activo: true },
    });

    if (!barbero) {
      throw new NotFoundException(`Barbero con ID ${barberoId} no encontrado`);
    }

    if (!barbero.sucursalId) {
      throw new BadRequestException(`El barbero con ID ${barberoId} no está asignado a ninguna sucursal`);
    }

    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);

    // Validar que fechaInicio < fechaFin (consistencia con checkDisponibilidad)
    if (fechaInicioDate >= fechaFinDate) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Optimizar: Consulta SQL más eficiente usando QueryBuilder
    // Filtrar por barbero Y sucursal para consistencia con checkDisponibilidad
    const citasExistentes = await this.citaRepository
      .createQueryBuilder('cita')
      .where('cita.barberoId = :barberoId', { barberoId })
      .andWhere('cita.sucursalId = :sucursalId', { sucursalId: barbero.sucursalId })
      .andWhere(
        '(cita.fecha_inicio BETWEEN :fechaInicio AND :fechaFin OR cita.fecha_fin BETWEEN :fechaInicio AND :fechaFin OR (cita.fecha_inicio <= :fechaInicio AND cita.fecha_fin >= :fechaFin))',
        { fechaInicio: fechaInicioDate, fechaFin: fechaFinDate },
      )
      .select(['cita.citaId', 'cita.barberoId', 'cita.fechaInicio', 'cita.fechaFin'])
      .getMany();

    // Generar slots básicos (sin servicio específico) usando horarios dinámicos
    const slots: SlotDisponibleDto[] = [];
    const intervaloMinutos = 30; // Intervalo por defecto cuando no hay servicio
    const fechaActual = new Date(fechaInicioDate);
    fechaActual.setHours(0, 0, 0, 0);

    while (fechaActual <= fechaFinDate) {
      // Usar calcularHorarioDisponible para obtener intersección sucursal + barbero
      // (consistencia con checkDisponibilidad)
      const horarioDisponible = await this.horarioService.calcularHorarioDisponible(
        barbero.sucursalId,
        barberoId,
        fechaActual,
      );

      // Si no hay horario disponible (sucursal cerrada o barbero sin horario), saltar este día
      if (!horarioDisponible) {
        fechaActual.setDate(fechaActual.getDate() + 1);
        continue;
      }

      // Obtener pausas del barbero para este día
      const pausas = await this.horarioService.obtenerPausasBarbero(barberoId, fechaActual);

      const fechaSlot = new Date(fechaActual);
      fechaSlot.setHours(horarioDisponible.horaInicio, horarioDisponible.minutoInicio, 0, 0);

      const horaFinTotal = horarioDisponible.horaFin * 60 + horarioDisponible.minutoFin;

      while (fechaSlot.getHours() * 60 + fechaSlot.getMinutes() < horaFinTotal) {
        const slotInicio = new Date(fechaSlot);
        const slotFin = new Date(fechaSlot);
        slotFin.setMinutes(slotFin.getMinutes() + intervaloMinutos);

        // Verificar que el slot no exceda el horario
        const slotFinTotal = slotFin.getHours() * 60 + slotFin.getMinutes();
        if (slotFinTotal > horaFinTotal) {
          break;
        }

        // Verificar si el slot está en una pausa
        const slotHoraInicio = slotInicio.getHours();
        const slotMinutoInicio = slotInicio.getMinutes();
        const slotHoraFin = slotFin.getHours();
        const slotMinutoFin = slotFin.getMinutes();

        const enPausa = this.horarioService.verificarSlotEnPausa(
          slotHoraInicio,
          slotMinutoInicio,
          slotHoraFin,
          slotMinutoFin,
          pausas,
        );

        // Verificar si el slot está disponible (no hay cita y no está en pausa)
        const disponible = !enPausa && this.isSlotDisponible(slotInicio, slotFin, barberoId, citasExistentes);

        slots.push({
          fechaInicio: slotInicio,
          fechaFin: slotFin,
          barberoId: barbero.barberoId,
          barberoNombre: barbero.nombre,
          disponible,
        });

        fechaSlot.setMinutes(fechaSlot.getMinutes() + intervaloMinutos);
      }

      // Avanzar al siguiente día
      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    return slots;
  }

  /**
   * Procesa solicitud de disponibilidad de fechas del mall (Interface 9 - SOL_DISP_FECHA)
   * Retorna disponibilidad en formato Interface 10 - DISP_FECHA
   * Si se proporciona appointment_date sin appointment_time, retorna TODOS los slots disponibles del día
   */
  async solicitarDisponibilidadFechaMall(solicitudDto: SolDispFechaDto): Promise<DispFechaResponseDto[]> {
    // Buscar el servicio por código externo
    const servicio = await this.servicioRepository.findOne({
      where: { codigoExterno: solicitudDto.service_external_id },
    });

    if (!servicio) {
      throw new NotFoundException(
        `Servicio con código externo "${solicitudDto.service_external_id}" no encontrado`,
      );
    }

    // Validar que el servicio esté activo
    if (!servicio.activo) {
      throw new BadRequestException(
        `El servicio con código externo "${solicitudDto.service_external_id}" no está activo`,
      );
    }

    // Validar que el servicio pertenezca a la sucursal (si está asignado)
    if (servicio.storeId && servicio.storeId !== solicitudDto.store_id) {
      throw new BadRequestException(
        `El servicio "${solicitudDto.service_external_id}" no está disponible en la sucursal ${solicitudDto.store_id}`,
      );
    }

    // Determinar rango de fechas para la consulta
    // appointment_date es obligatorio según la matriz de conexiones
    let fechaInicio: Date;
    let fechaFin: Date;

    try {
      // Validar formato de fecha (debe ser YYYY-MM-DD exactamente con 4 dígitos para el año)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(solicitudDto.appointment_date)) {
        throw new BadRequestException(
          `Formato de fecha inválido: ${solicitudDto.appointment_date}. Use formato YYYY-MM-DD (ej: 2024-12-23)`,
        );
      }

      // Validar que el año tenga exactamente 4 dígitos (validar antes de parsear)
      const partesFecha = solicitudDto.appointment_date.split('-');
      const añoStr = partesFecha[0];
      if (añoStr.length !== 4 || !/^\d{4}$/.test(añoStr)) {
        throw new BadRequestException(
          `El año debe tener exactamente 4 dígitos. Fecha proporcionada: ${solicitudDto.appointment_date}`,
        );
      }

      fechaInicio = parseFechaAmigable(solicitudDto.appointment_date);
      
      // Validar que la fecha sea válida
      if (isNaN(fechaInicio.getTime())) {
        throw new BadRequestException(`Fecha inválida: ${solicitudDto.appointment_date}`);
      }

      // Validar que el año esté en un rango razonable (2000-2100)
      const año = fechaInicio.getFullYear();
      if (año < 2000 || año > 2100) {
        throw new BadRequestException(
          `El año ${año} está fuera del rango válido (2000-2100). Fecha proporcionada: ${solicitudDto.appointment_date}`,
        );
      }

      // Validar que la fecha no sea en el pasado
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      fechaInicio.setHours(0, 0, 0, 0);
      
      if (fechaInicio < hoy) {
        throw new BadRequestException(
          `La fecha ${solicitudDto.appointment_date} es en el pasado. Solo se pueden consultar fechas futuras.`,
        );
      }

      // Validar que la fecha no esté demasiado lejana en el futuro (máximo 90 días)
      const fechaMaxima = new Date(hoy);
      fechaMaxima.setDate(fechaMaxima.getDate() + 90);
      fechaMaxima.setHours(23, 59, 59, 999);
      
      if (fechaInicio > fechaMaxima) {
        throw new BadRequestException(
          `La fecha ${solicitudDto.appointment_date} está más de 90 días en el futuro. Solo se pueden consultar fechas hasta 90 días adelante.`,
        );
      }

      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin = new Date(fechaInicio);
      fechaFin.setHours(23, 59, 59, 999);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Formato de fecha inválido: ${solicitudDto.appointment_date}`);
    }

    if (fechaInicio >= fechaFin) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Obtener barberos disponibles de la sucursal
    const barberos = await this.barberoRepository.find({
      where: { sucursalId: solicitudDto.store_id, activo: true },
    });

    if (barberos.length === 0) {
      throw new NotFoundException('No hay barberos disponibles en la sucursal');
    }

    // Obtener citas existentes en el rango de fechas
    const barberoIds = barberos.map((b) => b.barberoId);
    const citasExistentes = await this.citaRepository
      .createQueryBuilder('cita')
      .where('cita.sucursalId = :sucursalId', { sucursalId: solicitudDto.store_id })
      .andWhere('cita.barberoId IN (:...barberoIds)', { barberoIds })
      .andWhere(
        '(cita.fecha_inicio BETWEEN :fechaInicio AND :fechaFin OR cita.fecha_fin BETWEEN :fechaInicio AND :fechaFin OR (cita.fecha_inicio <= :fechaInicio AND cita.fecha_fin >= :fechaFin))',
        { fechaInicio, fechaFin },
      )
      .select([
        'cita.citaId',
        'cita.barberoId',
        'cita.fechaInicio',
        'cita.fechaFin',
        'cita.servicioId',
      ])
      .getMany();

    // Filtrar solo citas del servicio específico para id_cita
    const citasDelServicio = citasExistentes.filter(
      (cita) => cita.servicioId === servicio.servicioId,
    );

    // Formatear fechas en formato "YYYY-MM-DD HH:mm"
    const formatearFecha = (fecha: Date): string => {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      const hours = String(fecha.getHours()).padStart(2, '0');
      const minutes = String(fecha.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    const duracionMinutos = servicio.duracionMinutos;
    const fechaActual = new Date(fechaInicio);
    fechaActual.setHours(0, 0, 0, 0);

    // Array para recopilar todos los slots disponibles del día
    const slotsDisponibles: DispFechaResponseDto[] = [];

    // Función auxiliar para formatear la hora (HH:mm) desde una fecha
    const formatearHora = (fecha: Date): string => {
      const hours = String(fecha.getHours()).padStart(2, '0');
      const minutes = String(fecha.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    // Procesar el día solicitado - recopilar TODOS los slots disponibles
    while (fechaActual <= fechaFin) {
      // Para cada barbero
      for (const barbero of barberos) {
        // Obtener horario disponible (intersección entre sucursal y barbero)
        const horarioDisponible = await this.horarioService.calcularHorarioDisponible(
          solicitudDto.store_id,
          barbero.barberoId,
          fechaActual,
        );

        // Si no hay horario disponible, saltar este barbero para este día
        if (!horarioDisponible) {
          continue;
        }

        // Obtener pausas del barbero para este día
        const pausas = await this.horarioService.obtenerPausasBarbero(barbero.barberoId, fechaActual);

        // Generar slots del día dentro del horario disponible
        const fechaSlot = new Date(fechaActual);
        fechaSlot.setHours(horarioDisponible.horaInicio, horarioDisponible.minutoInicio, 0, 0);

        const horaFinTotal = horarioDisponible.horaFin * 60 + horarioDisponible.minutoFin;

        while (fechaSlot.getHours() * 60 + fechaSlot.getMinutes() < horaFinTotal) {
          const slotInicio = new Date(fechaSlot);
          const slotFin = new Date(fechaSlot);
          slotFin.setMinutes(slotFin.getMinutes() + duracionMinutos);

          // Verificar que el slot no exceda el horario disponible
          const slotFinTotal = slotFin.getHours() * 60 + slotFin.getMinutes();
          if (slotFinTotal > horaFinTotal) {
            break;
          }

          // Verificar si el slot está en una pausa
          const slotHoraInicio = slotInicio.getHours();
          const slotMinutoInicio = slotInicio.getMinutes();
          const slotHoraFin = slotFin.getHours();
          const slotMinutoFin = slotFin.getMinutes();

          const enPausa = this.horarioService.verificarSlotEnPausa(
            slotHoraInicio,
            slotMinutoInicio,
            slotHoraFin,
            slotMinutoFin,
            pausas,
          );

          // Verificar si el slot está disponible (no hay cita y no está en pausa)
          const disponible = !enPausa && this.isSlotDisponible(slotInicio, slotFin, barbero.barberoId, citasExistentes);

          // Agregar todos los slots disponibles al array
          if (disponible) {
            // Buscar si hay una cita existente en este slot
            const citaEnSlot = citasDelServicio.find((cita) => {
              return (
                cita.barberoId === barbero.barberoId &&
                ((slotInicio >= cita.fechaInicio && slotInicio < cita.fechaFin) ||
                  (slotFin > cita.fechaInicio && slotFin <= cita.fechaFin) ||
                  (slotInicio <= cita.fechaInicio && slotFin >= cita.fechaFin))
              );
            });

            slotsDisponibles.push({
              servicio_id: servicio.servicioId,
              fecha_inicio: formatearFecha(slotInicio),
              fecha_fin: formatearFecha(slotFin),
              duracion_minutos: duracionMinutos,
              appointment_time: formatearHora(slotInicio),
              id_cita: citaEnSlot?.citaId || null,
              id_bar: barbero.barberoId,
            });
          }

          // Avanzar al siguiente slot (usar duración del servicio como intervalo)
          fechaSlot.setMinutes(fechaSlot.getMinutes() + duracionMinutos);
        }
      }

      // Avanzar al siguiente día
      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    // Retornar todos los slots encontrados (puede ser un array vacío)
    return slotsDisponibles;
  }
}

