import mongoose, { Schema, Document } from 'mongoose';

// Definición de la interfaz para el documento Afiliado
export interface IAfiliadoDocument extends Document {
  nombre: string;
  dni: string;
  correo: string;
  especialidad: string;
  cipNumero: string; // Número de CIP
  consejoDepartamental: string; // Consejo Departamental
  fechaRegistro: Date;
  // Campos para gestión de meses
  mesesAfiliacion: number;
  mesInicio: Date;
  estadoPago: string;
}

// Definición del esquema para el Afiliado
const AfiliadoSchema: Schema = new Schema({
  nombre: { type: String, required: true },
  dni: { type: String, required: true, unique: true },
  correo: { type: String, required: true, unique: true },
  especialidad: { type: String, required: true },
  cipNumero: { type: String, required: true },
  consejoDepartamental: { type: String, required: true },
  fechaRegistro: { type: Date, default: Date.now },
  // Campos para gestión de meses
  mesesAfiliacion: { type: Number, default: 0 },
  mesInicio: { type: Date, default: null },
  estadoPago: { type: String, enum: ['Pendiente', 'Al día', 'Atrasado'], default: 'Pendiente' }
});

// Exportamos el modelo
export default mongoose.model<IAfiliadoDocument>('Afiliado', AfiliadoSchema);