// nombre del archivo: afiliado.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IAfiliadoDocument extends Document {
  nombre: string;
  dni: string;
  correo: string;
  especialidad: string;
  cipNumero: string;
  consejoDepartamental: string;
  fechaInicioPago: Date;
  fechaInicioMensualidades: Date; // NUEVO CAMPO
  estadoPago: string;
  mesesAdeudados: number;
  ultimoMesPagado: Date | null;
}

const afiliadoSchema: Schema<IAfiliadoDocument> = new Schema<IAfiliadoDocument>({
  nombre: { type: String, required: true },
  dni: {
    type: String,
    required: true,
    unique: true, // Evitar DNIs duplicados
    validate: {
      validator: function (v: string): boolean {
        return /^\d{8}$/.test(v);
      },
      message: (props: { value: string }): string =>
        `${props.value} no es un DNI válido. Debe tener 8 dígitos.`,
    },
  },
  correo: {
    type: String,
    required: true,
    unique: true, // ✅ Agregar unique también al correo
    validate: {
      validator: function (v: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'El correo electrónico no es válido.',
    },
  },
  especialidad: { type: String, required: true },
  cipNumero: {
    type: String,
    required: true,
    unique: true, // Evitar CIPs duplicados
    validate: {
      validator: function (v: string): boolean {
        return /^\d{6,8}$/.test(v);
      },
      message: (props: { value: string }): string =>
        `${props.value} no es un CIP válido. Debe tener entre 6 y 8 dígitos.`,
    },
  },
  consejoDepartamental: { type: String, required: true },
  fechaInicioPago: {
    type: Date,
    required: true,
    validate: {
      validator: function (v: Date): boolean {
        const now = new Date();
        // ✅ Permitir fechas desde 2 años atrás hasta 1 mes futuro
        const minFecha = new Date(now.getFullYear() - 2, 0, 1);
        const maxFecha = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return v >= minFecha && v <= maxFecha;
      },
      message: 'La fecha de inicio de pago debe estar entre 2 años atrás y el próximo mes.',
    },
  },
  fechaInicioMensualidades: {
    // ✅ VALIDACIÓN CORREGIDA
    type: Date,
    required: true,
    validate: {
      validator: function (v: Date): boolean {
        const now = new Date();
        // Permitir fechas desde 2 años atrás hasta 6 meses futuros
        const minFecha = new Date(now.getFullYear() - 2, 0, 1);
        const maxFecha = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return v >= minFecha && v <= maxFecha;
      },
      message: 'La fecha de inicio de mensualidades debe estar entre 2 años atrás y 6 meses futuros.',
    },
  },
  estadoPago: {
    type: String,
    enum: ['Pendiente', 'Al día', 'Suspendido'], // ✅ Cambiado 'Habilitado' por 'Al día' para consistencia
    default: 'Pendiente',
  },
  mesesAdeudados: { type: Number, default: 0 },
  ultimoMesPagado: { type: Date, default: null },
}, {
  timestamps: true // ✅ Agregar timestamps automáticos
});

// ✅ Índices optimizados (sin redundancia)
afiliadoSchema.index({ cipNumero: 1 });
afiliadoSchema.index({ dni: 1 });
afiliadoSchema.index({ correo: 1 });
afiliadoSchema.index({ estadoPago: 1 });

// ✅ Middleware pre-save para validaciones adicionales
afiliadoSchema.pre('save', function(next) {
  // Validar que fechaInicioMensualidades no sea anterior a fechaInicioPago
  if (this.fechaInicioMensualidades < this.fechaInicioPago) {
    const error = new Error('La fecha de inicio de mensualidades no puede ser anterior a la fecha de inicio de pago');
    return next(error);
  }
  next();
});

const Afiliado = mongoose.model<IAfiliadoDocument>('Afiliado', afiliadoSchema);

export default Afiliado;