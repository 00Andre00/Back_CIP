import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interfaz que representa la estructura de un documento de Reserva.
 * Contiene la información necesaria para gestionar una reserva, incluyendo
 * detalles sobre el tipo de reserva, intención, beneficiario, fecha, hora, etc.
 */
interface IReserva extends Document {
  tipo: 'Publica' | 'Privada';
  intencion: string;
  beneficiario: string;
  fecha: Date;
  hora: string;
  email: string;
  comentario?: string;
  estadoPago: 'pendiente' | 'pagado';
  pagoId: string;
}

/**
 * Esquema de Mongoose para el modelo Reserva.
 * Define la estructura y validaciones de cada campo en la colección de reservas.
 */
const reservaSchema: Schema = new Schema({
  tipo: {
    type: String,
    enum: ['Publica', 'Privada'],
    default: 'Publica',
    required: true
  },
  // Campo "createdAt": almacena la fecha de creación y permite la expiración automática
  // de la reserva después de 30 minutos (1800 segundos)
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1800 // 30 minutos en segundos
  },
  intencion: {
    type: String,
    required: true,
    trim: true,
    validate: {
      // Valida que la intención no sea una cadena vacía luego de eliminar espacios
      validator: function(v: string) {
        return v.trim().length > 0;
      },
      message: 'La intención es requerida'
    }
  },
  beneficiario: {
    type: String,
    required: true,
    trim: true,
    validate: {
      // Valida que el beneficiario no sea una cadena vacía luego de eliminar espacios
      validator: function(v: string) {
        return v.trim().length > 0;
      },
      message: 'El beneficiario es requerido'
    }
  },
  fecha: {
    type: Date,
    required: true,
    validate: {
      // Valida que la fecha sea igual o posterior a la fecha actual
      validator: function(v: Date) {
        return v >= new Date();
      },
      message: 'La fecha no puede ser en el pasado'
    }
  },
  hora: {
    type: String,
    required: true,
    trim: true,
    validate: {
      // Valida que la hora cumpla con el formato HH:MM en horario de 24 horas
      validator: function(v: string) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Formato de hora inválido'
    }
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    validate: {
      // Valida que el email tenga un formato válido
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Ingrese un correo electrónico válido'
    }
  },
  comentario: {
    type: String,
    trim: true,
    default: ''
  },
  estadoPago: {
    type: String,
    enum: ['pendiente', 'pagado'],
    default: 'pendiente'
  },
  pagoId: {
    type: String
  }
}, {
  // Agrega automáticamente los campos createdAt y updatedAt
  timestamps: true
});

// Exporta el modelo "Reserva" para su uso en otras partes de la aplicación.
export default mongoose.model<IReserva>('Reserva', reservaSchema);
