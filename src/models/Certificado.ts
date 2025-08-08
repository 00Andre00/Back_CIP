// nombre del archivo: Certificado.ts
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
    required: true,
  },
  preferenceId: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v: string): boolean {
        return v.length > 0;
      },
      message: 'El preferenceId no puede estar vacío.',
    },
  },
  pagoId: {
    type: String,
    default: null,
    validate: {
      validator: function (v: string | null): boolean {
        return v === null || v.length > 0;
      },
      message: 'El pagoId no puede ser una cadena vacía.',
    },
  },
  estado: {
    type: String,
    enum: ['pendiente', 'pagado', 'cancelado'],
    default: 'pendiente',
  },
  precio: {
    type: Number,
    required: true,
    default: 15.00,
  },
  tipoPago: {
    type: String,
    default: 'certificado',
  },
  fechaCreacion: {
    type: Date,
    default: Date.now,
  },
  fechaPago: {
    type: Date,
    default: null,
  },
  fechaVigencia: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Índices para optimizar consultas
CertificadoSchema.index({ preferenceId: 1 }, { unique: true });
CertificadoSchema.index({ pagoId: 1 });
CertificadoSchema.index({ afiliado: 1, estado: 1 });
CertificadoSchema.index({ fechaCreacion: 1 }); // Nuevo índice

// Método estático para buscar certificado válido
CertificadoSchema.statics.findValidCertificate = function (certificadoId: string) {
  return this.findOne({
    _id: certificadoId,
    estado: 'pagado',
  }).populate('afiliado', 'nombre cipNumero especialidad consejoDepartamental');
};

// Método de instancia para obtener datos para email
CertificadoSchema.methods.getEmailData = function () {
  if (!this.afiliado) {
    throw new Error('El afiliado no está populado. Usa populate("afiliado") antes de llamar a getEmailData.');
  }
  return {
    ingeniero: {
      nombres: this.afiliado.nombre.split(' ')[0] || this.afiliado.nombre,
      apellidos: this.afiliado.nombre.split(' ').slice(1).join(' ') || '',
      consejoDepartamental: this.afiliado.consejoDepartamental,
      registroCIP: this.afiliado.cipNumero,
      especialidad: this.afiliado.especialidad,
      fechaIncorporacion: this.afiliado.fechaInicioPago,
    },
    fechaVigencia: this.fechaVigencia,
    _id: this.id,
  };
};

export default mongoose.model<ICertificado>('Certificado', CertificadoSchema);