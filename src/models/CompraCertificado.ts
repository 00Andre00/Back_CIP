// nombre del archivo: CompraCertificado.ts
import { Schema, model, Document } from 'mongoose';

export interface ICompraCertificado extends Document {
  usuarioId: Schema.Types.ObjectId;
  certificadoId: Schema.Types.ObjectId;
  email: string;
  fechaCompra: Date;
  preferenceId?: string;
  estadoPago: 'pendiente' | 'pagado' | 'rechazado';
}

const compraCertificadoSchema = new Schema<ICompraCertificado>({
  usuarioId: {
    type: Schema.Types.ObjectId,
    ref: 'UsuarioNormal',
    required: true,
  },
  certificadoId: {
    type: Schema.Types.ObjectId,
    ref: 'Certificado',
    required: true,
  },
  email: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'El correo electrónico no es válido.',
    },
  },
  fechaCompra: {
    type: Date,
    default: Date.now,
  },
  preferenceId: {
    type: String,
    validate: {
      validator: function (v: string | undefined): boolean {
        return v === undefined || v.length > 0;
      },
      message: 'El preferenceId no puede ser una cadena vacía.',
    },
  },
  estadoPago: {
    type: String,
    enum: ['pendiente', 'pagado', 'rechazado'],
    default: 'pendiente',
  },
});

// Índices para optimizar consultas
compraCertificadoSchema.index({ usuarioId: 1 });
compraCertificadoSchema.index({ certificadoId: 1 });
compraCertificadoSchema.index({ preferenceId: 1 });

// Método estático para buscar compras pendientes
compraCertificadoSchema.statics.findPendingByUser = function (usuarioId: string) {
  return this.find({
    usuarioId,
    estadoPago: 'pendiente',
  }).populate('certificadoId');
};

export default model<ICompraCertificado>('CompraCertificado', compraCertificadoSchema);