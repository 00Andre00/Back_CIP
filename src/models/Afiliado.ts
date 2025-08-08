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
        return v <= new Date(now.getFullYear(), now.getMonth() + 1, 0); // No futura más allá del mes actual
      },
      message: 'La fecha de inicio de pago no puede ser posterior al mes actual.',
    },
  },
  fechaInicioMensualidades: {
    // NUEVO CAMPO
    type: Date,
    required: true,
    validate: {
      validator: function (v: Date): boolean {
        const now = new Date();
        return v <= new Date(now.getFullYear(), now.getMonth() + 7, 0); // Permitir hasta 6 meses futuros
      },
      message: 'La fecha de inicio de mensualidades no puede ser posterior a 6 meses desde ahora.',
    },
  },
  estadoPago: {
    type: String,
    enum: ['Pendiente', 'Habilitado', 'Suspendido'],
    default: 'Pendiente',
  },
  mesesAdeudados: { type: Number, default: 0 },
  ultimoMesPagado: { type: Date, default: null },
});

// Índices para optimizar consultas
afiliadoSchema.index({ cipNumero: 1 }, { unique: true });
afiliadoSchema.index({ dni: 1 }, { unique: true });

const Afiliado = mongoose.model<IAfiliadoDocument>('Afiliado', afiliadoSchema);

export default Afiliado;