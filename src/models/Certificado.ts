
export interface IIngeniero {
  nombre: string;
  apellido: string;
  registroCIP: string;
  fechaIncorporacion: Date;
  consejoDepartamental: string;
  especialidad: string;
}

import { Schema, model, Document } from 'mongoose';

/**
 * Interfaz que define la estructura de un certificado de habilitación para ingenieros.
 */
export interface ICertificado extends Document {
  tipo: 'habilidad'; // Solo para certificados de habilidad
  fechaEmision: Date;

  nombres: string;
  apellidos: string;
  numeroCIP: string; // Número de CIP del ingeniero
  cedulaIdentidad: string; // Cédula de identidad del ingeniero
  email: string; // Email del ingeniero
  telefono: string; // Teléfono del ingeniero
  celular: string; // Celular del ingeniero
  direccion: string; // Dirección del ingenier

  pagado: boolean;
  estadoPago: 'pendiente' | 'pagado' | 'rechazado'; // Estado del pago del certificado
  registroCIP: string; // Número de registro del CIP
  fechaIncorporacion: Date; // Fecha de incorporación al Colegio
  consejoDepartamental: string; // Consejo departamental al que pertenece
  especialidad: string; // Especialidad del ingeniero
  fechaVigencia: Date; // Fecha de vigencia del certificado (generalmente 1 año)
}

const certificadoSchema = new Schema<ICertificado>({
  tipo: { 
    type: String, 
    required: true, 
    enum: ['habilidad'] // Solo tipo habilidad para ingenieros
  },
  fechaEmision: { 
    type: Date, 
    default: Date.now 
  },
  pagado: { 
    type: Boolean, 
    default: false 
  },
  estadoPago: { 
    type: String, 
    enum: ['pendiente', 'pagado', 'rechazado'], 
    default: 'pendiente' 
  },
  registroCIP: { 
    type: String, 
    required: true 
  },
  fechaIncorporacion: { 
    type: Date, 
    required: true 
  },
  consejoDepartamental: { 
    type: String, 
    required: true 
  },
  especialidad: { 
    type: String, 
    required: true 
  },
  fechaVigencia: { 
    type: Date, 
    required: true 
  }
});

export default model<ICertificado>('Certificado', certificadoSchema);
