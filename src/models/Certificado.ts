import { Schema, model, Document, Types } from 'mongoose';

/**
 * Interfaz que define la estructura de un certificado.
 * Los certificados pueden ser de tipo:
 * - Bautizo
 * - Confirmación
 * - Matrimonio
 */
export interface ICertificado extends Document {
  // Datos generales
  tipo: 'bautizo' | 'confirmacion' | 'matrimonio';
  fechaEmision: Date;
  detallesAdicionales?: string;
  dni?: string;
  padrinos?: string;
  oficiante?: string;
  pagado: boolean;
  fechaPago?: Date;
  fechaCompra?: Date;
  pagoId?: string;
  estadoPago?: 'pendiente' | 'pagado' | 'rechazado';
  _id: Types.ObjectId;
  

  // Datos específicos para Bautismo
  padre?: string;
  madre?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  fechaNacimiento?: Date;
  fechaBautismo?: Date;
  
  // Para Confirmación se reutilizan: oficiante y padrinos, y se usa fechaEmision como fecha de confirmación
  // (El campo "nombreConfirmado" fue eliminado)

  // Datos específicos para Matrimonio
  esposo?: string;
  esposa?: string;
  lugarNacimientoEsposo?: string;
  papaEsposo?: string;
  mamaEsposo?: string;
  lugarNacimientoEsposa?: string;
  papaEsposa?: string;
  mamaEsposa?: string;
  fechaMatrimonio?: Date;
  testigos?: string;
}

const certificadoSchema = new Schema<ICertificado>({
  tipo: { type: String, required: true, enum: ['bautizo', 'confirmacion', 'matrimonio'] },
  fechaEmision: { type: Date, default: Date.now },
  detallesAdicionales: { type: String },
  dni: { type: String },
  pagado: { type: Boolean, default: false },
  fechaPago: { type: Date },
  fechaCompra: { type: Date },
  pagoId: { type: String },
  estadoPago: { type: String, enum: ['pendiente', 'pagado', 'rechazado'], default: 'pendiente' },
  
  // Datos generales
  padrinos: { type: String },
  oficiante: { type: String },

  // Datos para Bautismo
  padre: { type: String },
  madre: { type: String },
  distrito: { type: String },
  provincia: { type: String },
  departamento: { type: String },
  fechaNacimiento: { type: Date },
  fechaBautismo: { type: Date },

  // Confirmación
  // (El campo "nombreConfirmado" fue eliminado)

  // Datos para Matrimonio
  esposo: { type: String },
  esposa: { type: String },
  lugarNacimientoEsposo: { type: String },
  papaEsposo: { type: String },
  mamaEsposo: { type: String },
  lugarNacimientoEsposa: { type: String },
  papaEsposa: { type: String },
  mamaEsposa: { type: String },
  fechaMatrimonio: { type: Date },
  testigos: { type: String }
});

export default model<ICertificado>('Certificado', certificadoSchema);
