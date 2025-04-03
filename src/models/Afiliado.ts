import mongoose, { Document, Schema } from 'mongoose';

export interface IAfiliadoDocument extends Document {
  nombre: string;
  dni: string;
  correo: string;
  especialidad: string;
  cipNumero: string;
  consejoDepartamental: string;
  estadoPago: string;
  mesesAdeudados: number;
  ultimoMesPagado: Date | null;
}

const afiliadoSchema: Schema<IAfiliadoDocument> = new Schema<IAfiliadoDocument>({
  nombre: { type: String, required: true },
  dni: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  correo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  especialidad: { type: String, required: true },
  cipNumero: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  consejoDepartamental: { type: String, required: true },
  estadoPago: { type: String, default: 'Pendiente' },
  mesesAdeudados: { type: Number, default: 0 },
  ultimoMesPagado: { type: Date, default: null }
});

const Afiliado = mongoose.model<IAfiliadoDocument>('Afiliado', afiliadoSchema);

export default Afiliado;