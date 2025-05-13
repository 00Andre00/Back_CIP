import { Schema, model, Document, Types } from 'mongoose';

/**
 * Interfaz que define la estructura de un certificado.
 * Los certificados pueden ser de tipo:
 * - Bautizo
 * - Confirmación
 * - Matrimonio
 * - Habilidad (para ingenieros)
 */
export interface ICertificado extends Document {
  // Datos generales
  tipo: 'bautizo' | 'confirmacion' | 'matrimonio' | 'habilidad';
  fechaEmision: Date;
  detallesAdicionales?: string;
  dni?: string;
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
  padrinos?: string;
  oficiante?: string;
  
  // Datos específicos para Confirmación
  // (reutiliza oficiante y padrinos)
  
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
  
  // Datos específicos para Certificado de Habilidad (Ingenieros)
  registroCIP?: string;
  fechaIncorporacion?: Date;
  consejoDepartamental?: string;
  especialidad?: string;
  fechaVigencia?: Date;
}

const certificadoSchema = new Schema<ICertificado>({
  tipo: { 
    type: String, 
    required: true, 
    enum: ['bautizo', 'confirmacion', 'matrimonio', 'habilidad'] 
  },
  fechaEmision: { type: Date, default: Date.now },
  detallesAdicionales: { type: String },
  dni: { type: String },
  pagado: { type: Boolean, default: false },
  fechaPago: { type: Date },
  fechaCompra: { type: Date },
  pagoId: { type: String },
  estadoPago: { 
    type: String, 
    enum: ['pendiente', 'pagado', 'rechazado'], 
    default: 'pendiente' 
  },
  
  // Datos para Bautismo
  padre: { type: String },
  madre: { type: String },
  distrito: { type: String },
  provincia: { type: String },
  departamento: { type: String },
  fechaNacimiento: { type: Date },
  fechaBautismo: { type: Date },
  padrinos: { type: String },
  oficiante: { type: String },

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
  testigos: { type: String },
  
  // Datos para Certificado de Habilidad
  registroCIP: { type: String },
  fechaIncorporacion: { type: Date },
  consejoDepartamental: { type: String },
  especialidad: { type: String },
  fechaVigencia: { type: Date }
});

// Creamos la interfaz específica para ingenieros
export interface IIngeniero {
  nombre: string;
  apellido: string;
  registroCIP: string;
  fechaIncorporacion: Date;
  consejoDepartamental: string;
  especialidad: string;
}

export default model<ICertificado>('Certificado', certificadoSchema);