import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Venta } from './venta.entity';
import { CatEstadoTransaccion } from './catestadotransaccion.entity';

@Entity('transaccionpago', { schema: 'barberia' })
export class TransaccionPago {
  @PrimaryGeneratedColumn({ name: 'transaccion_id' })
  transaccionId: number;

  @Column({ name: 'venta_id' })
  ventaId: number;

  @ManyToOne(() => Venta, (venta) => venta.transacciones)
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @Column({ name: 'codigo_negocio', type: 'varchar', length: 5 })
  codigoNegocio: string;

  @Column({ name: 'transaccion_externa_id', type: 'varchar', length: 100, unique: true })
  transaccionExternaId: string;

  @Column({ name: 'tipo_operacion', type: 'varchar', length: 20, default: 'COMPRA' })
  tipoOperacion: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'char', length: 3, default: 'MXN' })
  moneda: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion?: string;

  @Column({ name: 'medio_pago', type: 'varchar', length: 50, default: 'TARJETA' })
  medioPago: string;

  @Column({ name: 'estado_tx_id' })
  estadoTxId: number;

  @ManyToOne(() => CatEstadoTransaccion, (estado) => estado.transacciones)
  @JoinColumn({ name: 'estado_tx_id' })
  estadoTx: CatEstadoTransaccion;

  @Column({ type: 'int', default: 1 })
  intentos: number;

  @Column({ name: 'numero_tarjeta_mask', type: 'varchar', length: 20, nullable: true })
  numeroTarjetaMask?: string;

  @Column({ name: 'token_tarjeta', type: 'varchar', length: 200, nullable: true })
  tokenTarjeta?: string;

  @Column({ name: 'nombre_tarjetahab', type: 'varchar', length: 120, nullable: true })
  nombreTarjetahab?: string;

  @Column({ name: 'mes_exp', type: 'smallint', nullable: true })
  mesExp?: number;

  @Column({ name: 'anio_exp', type: 'smallint', nullable: true })
  anioExp?: number;

  @Column({ name: 'cvv_hash', type: 'bytea', nullable: true })
  cvvHash?: Buffer;

  @Column({ name: 'cta_origen', type: 'varchar', length: 34, nullable: true })
  ctaOrigen?: string;

  @Column({ name: 'cta_destino', type: 'varchar', length: 34, nullable: true })
  ctaDestino?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  autorizacion?: string;

  @Column({ name: 'banco_payload', type: 'text', nullable: true })
  bancoPayload?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

