import mongoose, { Schema, Document, model } from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * Interfaz que define la estructura de un usuario.
 * Incluye propiedades básicas y un método para verificar la contraseña.
 */
export interface IUsuario extends Document {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  isAdmin: boolean;  // Indica si el usuario tiene privilegios de administrador
  verificarPassword(passwordIngresado: string): Promise<boolean>;
}

/**
 * Esquema de Mongoose para el modelo Usuario.
 * Define los campos y sus validaciones para cada documento de usuario.
 */
const usuarioSchema: Schema = new Schema({
  nombre: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false  // Por defecto, el usuario no es administrador
  }
});

// Middleware para encriptar la contraseña antes de guardar el documento
usuarioSchema.pre<IUsuario>('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Método para comparar la contraseña ingresada con la contraseña almacenada (encriptada)
usuarioSchema.methods.verificarPassword = async function (passwordIngresado: string) {
  return await bcrypt.compare(passwordIngresado, this.password);
};

export default model<IUsuario>('Usuario', usuarioSchema);
