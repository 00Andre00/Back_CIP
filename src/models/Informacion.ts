import mongoose, { Schema, Document } from 'mongoose';

export interface IDirectivo {
  nombre: string;
  cargo: string;
}

export interface IInformacion extends Document {
  periodo: string;
  fechaActualizacion: string;
  telefono: string;
  direccion: string;
  horarioLV: string;
  horarioSab: string;
  correo: string;
  web: string;
  facebook: string;
  instagram: string;
  directivos: IDirectivo[];
}

const informacionSchema = new Schema<IInformacion>({
  periodo: { type: String, required: true },
  fechaActualizacion: { type: String, required: true },
  telefono: { type: String, required: true },
  direccion: { type: String, required: true },
  horarioLV: { type: String, required: true },
  horarioSab: { type: String, required: true },
  correo: { type: String, required: true },
  web: { type: String, required: true },
  facebook: { type: String, required: true },
  instagram: { type: String, required: true },
  directivos: [
    {
      nombre: { type: String, required: true },
      cargo: { type: String, required: true }
    }
  ]
});

const Informacion = mongoose.model<IInformacion>('Informacion', informacionSchema);

export default Informacion;