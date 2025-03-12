import { Schema, model, Document } from 'mongoose';
import { ICertificado } from './Certificado';

/**
 * Interfaz que define la estructura de un usuario normal.
 * Contiene datos personales y la relación con los certificados asociados.
 */
export interface IUsuarioNormal extends Document {
    dni: string;
    nombre: string;
    apellido: string;
    certificados: ICertificado[];
}

/**
 * Esquema de Mongoose para el modelo UsuarioNormal.
 * Establece las propiedades, validaciones y la relación con los certificados.
 */
const usuarioNormalSchema = new Schema<IUsuarioNormal>({
    dni: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    certificados: [{ type: Schema.Types.ObjectId, ref: 'Certificado' }],
});

// Exporta el modelo "UsuarioNormal" para su uso en la aplicación.
export default model<IUsuarioNormal>('UsuarioNormal', usuarioNormalSchema);
