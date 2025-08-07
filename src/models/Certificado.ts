// models/Certificado.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICertificado extends Document {
  afiliado: mongoose.Types.ObjectId;
  preferenceId: string;
  pagoId?: string;
  estado: 'pendiente' | 'pagado' | 'cancelado';
  precio: number;
  tipoPago: 'certificado';
  fechaCreacion: Date;
  fechaPago?: Date;
  fechaVigencia?: Date;
}

const CertificadoSchema = new Schema<ICertificado>({
  afiliado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Afiliado',
    required: true
  },
  preferenceId: {
    type: String,
    required: true,
    unique: true
  },
  pagoId: {
    type: String,
    default: null
  },
  estado: {
    type: String,
    enum: ['pendiente', 'pagado', 'cancelado'],
    default: 'pendiente'
  },
  precio: {
    type: Number,
    required: true,
    default: 15.00
  },
  tipoPago: {
    type: String,
    default: 'certificado'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaPago: {
    type: Date,
    default: null
  },
  fechaVigencia: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
CertificadoSchema.index({ preferenceId: 1 });
CertificadoSchema.index({ pagoId: 1 });
CertificadoSchema.index({ afiliado: 1, estado: 1 });

export default mongoose.model<ICertificado>('Certificado', CertificadoSchema);