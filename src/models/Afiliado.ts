// nombre del archivo : afiliado.ts
import mongoose, { Document, Schema } from 'mongoose';
import { arch } from 'os';

export interface IAfiliadoDocument extends Document {
  nombre: string;
  dni: string;
  correo: string;
  especialidad: string;
  cipNumero: string;
  consejoDepartamental: string;
  fechaInicioPago: Date; // NUEVO CAMPO
  estadoPago: string;
  mesesAdeudados: number;
  ultimoMesPagado: Date | null;
}

const afiliadoSchema: Schema<IAfiliadoDocument> = new Schema<IAfiliadoDocument>({
  nombre: { type: String, required: true },
  dni: { 
    type: String, 
    required: true, 
    validate: {
      validator: function(v: string): boolean {
        return /^\d{8}$/.test(v);
      },
      message: (props: { value: string }): string => `${props.value} no es un DNI válido. Debe tener 8 dígitos.`
    }
  },
  correo: { type: String, required: true },
  especialidad: { type: String, required: true },
  cipNumero: { 
    type: String, 
    required: true,
  },
  consejoDepartamental: { type: String, required: true },
  fechaInicioPago: { type: Date, required: true }, // NUEVO CAMPO
  estadoPago: { type: String, default: 'Pendiente' },
  mesesAdeudados: { type: Number, default: 0 },
  ultimoMesPagado: { type: Date, default: null }
});

const Afiliado = mongoose.model<IAfiliadoDocument>('Afiliado', afiliadoSchema);

export default Afiliado;