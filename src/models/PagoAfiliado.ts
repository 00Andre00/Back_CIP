// nombre del archivo: PagoAfiliado.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPagoAfiliado extends Document {
  afiliado: mongoose.Types.ObjectId;
  mesesPagados: Date[];
  preferenceId: string;
  pagoId?: string;
  estado: 'pendiente' | 'pagado' | 'fallido' | 'reservado';
  fechaCreacion: Date;
  montoTotal: number;
  fechaPago?: Date;
  metadata?: {
    certificadoId?: string;
    [key: string]: any;
  };
}

const PagoAfiliadoSchema: Schema = new Schema({
  afiliado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Afiliado',
    required: true,
  },
  mesesPagados: [{
    type: Date,
    required: true,
    validate: {
      validator: function (v: Date): boolean {
        return !isNaN(v.getTime());
      },
      message: 'Fecha de mes pagado inválida.',
    },
  }],
  preferenceId: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string): boolean {
        return v.length > 0;
      },
      message: 'El preferenceId no puede estar vacío.',
    },
  },
  pagoId: {
    type: String,
    validate: {
      validator: function (v: string | undefined): boolean {
        return v === undefined || v.length > 0;
      },
      message: 'El pagoId no puede ser una cadena vacía.',
    },
  },
  estado: {
    type: String,
    enum: ['pendiente', 'pagado', 'fallido', 'reservado'],
    default: 'pendiente',
  },
  fechaCreacion: {
    type: Date,
    default: Date.now,
  },
  montoTotal: {
    type: Number,
    required: true,
    validate: {
      validator: function (this: IPagoAfiliado, v: number): boolean {
        const expected = this.mesesPagados.length * 20 + (this.metadata?.certificadoId ? 15 : 0);
        return v === expected;
      },
      message: 'El monto total no coincide con los meses pagados y certificado.',
    },
  },
  fechaPago: {
    type: Date,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

// Índices para optimizar consultas
PagoAfiliadoSchema.index({ afiliado: 1 });
PagoAfiliadoSchema.index({ preferenceId: 1 });
PagoAfiliadoSchema.index({ pagoId: 1 });

// Método estático para buscar pagos exitosos
PagoAfiliadoSchema.statics.findSuccessfulByAfiliado = function (afiliadoId: string) {
  return this.find({
    afiliado: afiliadoId,
    estado: 'pagado',
  }).sort({ fechaPago: -1 });
};

const PagoAfiliado = mongoose.model<IPagoAfiliado>('PagoAfiliado', PagoAfiliadoSchema);

export default PagoAfiliado;