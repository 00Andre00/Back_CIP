// nombre del archivo: mensualidad.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IMensualidadDocument extends Document {
  afiliadoId: mongoose.Types.ObjectId;
  mes: string; // "01", "02", etc.
  anio: string; // "2024", "2025", etc.
  monto: number; // 20.00
  pagado: boolean;
  fechaPago?: Date | null;
  fechaCreacion: Date;
  fechaVencimiento: Date;
}

const mensualidadSchema: Schema<IMensualidadDocument> = new Schema<IMensualidadDocument>({
  afiliadoId: {
    type: Schema.Types.ObjectId,
    ref: 'Afiliado',
    required: true,
  },
  mes: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string): boolean {
        return /^(0[1-9]|1[0-2])$/.test(v);
      },
      message: 'El mes debe estar en formato MM (01-12)',
    },
  },
  anio: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string): boolean {
        return /^\d{4}$/.test(v) && parseInt(v) >= 2020 && parseInt(v) <= 2030;
      },
      message: 'El año debe ser un número de 4 dígitos entre 2020 y 2030',
    },
  },
  monto: {
    type: Number,
    required: true,
    default: 20.00,
  },
  pagado: {
    type: Boolean,
    required: true,
    default: false,
  },
  fechaPago: {
    type: Date,
    default: null,
  },
  fechaCreacion: {
    type: Date,
    default: Date.now,
  },
  fechaVencimiento: {
    type: Date,
    required: true,
  },
});

// Índice compuesto para evitar duplicados
mensualidadSchema.index({ afiliadoId: 1, mes: 1, anio: 1 }, { unique: true });
// Índices adicionales para consultas
mensualidadSchema.index({ afiliadoId: 1, pagado: 1 });
mensualidadSchema.index({ fechaVencimiento: 1 });

// Calcular fecha de vencimiento
mensualidadSchema.pre('save', function (next) {
  const año = parseInt(this.anio);
  const mes = parseInt(this.mes);
  this.fechaVencimiento = new Date(año, mes, 0); // Último día del mes
  next();
});

// Método estático para buscar mensualidades pendientes
mensualidadSchema.statics.findPendingByAfiliado = function (afiliadoId: string) {
  return this.find({
    afiliadoId,
    pagado: false,
    fechaVencimiento: { $gte: new Date() },
  }).sort({ anio: 1, mes: 1 });
};

const Mensualidad = mongoose.model<IMensualidadDocument>('Mensualidad', mensualidadSchema);

export default Mensualidad;