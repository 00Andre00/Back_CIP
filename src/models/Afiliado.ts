// AfiliadoSchema.ts 
import mongoose, { Schema, Document } from 'mongoose';
import { customAlphabet } from 'nanoid';

// Generador de código CIP
const nanoid = customAlphabet('0123456789', 6);

// Definición de la interfaz para el documento Afiliado
export interface IAfiliadoDocument extends Document {
  nombre: string;
  dni: string;
  correo: string;
  especialidad: string;
  mensaje?: string;
  codigoCip: string;
  fechaRegistro: Date;
}

// Definición del esquema para el Afiliado
const AfiliadoSchema: Schema = new Schema({
  nombre: { type: String, required: true },
  dni: { type: String, required: true, unique: true },
  correo: { type: String, required: true, unique: true },
  especialidad: { type: String, required: true },
  mensaje: { type: String, default: '' },
  codigoCip: { type: String, unique: true },
  fechaRegistro: { type: Date, default: Date.now }
});

// Middleware pre-save para generar automáticamente el código CIP
AfiliadoSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generar código CIP: "cip" seguido de 6 dígitos aleatorios
    this.codigoCip = `cip${nanoid()}`;
  }
  next();
});

// Exportamos el modelo
export default mongoose.model<IAfiliadoDocument>('Afiliado', AfiliadoSchema);