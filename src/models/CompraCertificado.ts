import { Schema, model, Document } from "mongoose";
import { ICertificado } from "./Certificado";
import { IUsuarioNormal } from "./UsuarioNormal";

/**
 * Interfaz que define la estructura de un documento de compra de certificado.
 * Incluye la referencia al usuario, al certificado, el email de compra y la fecha en que se realizó.
 */
export interface ICompraCertificado extends Document {
  usuarioId: IUsuarioNormal["_id"];
  certificadoId: ICertificado["_id"];
  email: string;
  fechaCompra: Date;
}

/**
 * Esquema de Mongoose para la colección de compras de certificados.
 * Se encarga de validar y estructurar los datos antes de almacenarlos en la base de datos.
 */
const compraCertificadoSchema = new Schema<ICompraCertificado>({
  usuarioId: {
    type: Schema.Types.ObjectId,
    ref: "UsuarioNormal",
    required: true,
  },
  certificadoId: {
    type: Schema.Types.ObjectId,
    ref: "Certificado",
    required: true,
  },
  email: { type: String, required: true },
  fechaCompra: { type: Date, default: Date.now },
});

// ultimas modifcACIONES

// Exporta el modelo para que pueda ser utilizado en otras partes de la aplicación.
export default model<ICompraCertificado>(
  "CompraCertificado",
  compraCertificadoSchema
);
