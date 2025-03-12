import { Request, Response } from 'express'; // Importa los tipos de Request y Response de Express para tipado en TypeScript
import jwt from 'jsonwebtoken'; // Importa JWT para la generación de tokens de autenticación
import Usuario from '../models/Usuario'; // Importa el modelo de Usuario para interactuar con la base de datos

// Controlador para el inicio de sesión de administradores
export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body; // Extrae el email y password del cuerpo de la solicitud

  try {
    // Busca un usuario en la base de datos con el email proporcionado
    const admin = await Usuario.findOne({ email });

    // Verifica si el usuario existe, si la contraseña es correcta y si tiene permisos de administrador
    if (!admin || !(await admin.verificarPassword(password)) || !admin.isAdmin) {
      res.status(401).json({ message: 'Credenciales incorrectas o no es administrador' });
      return;
    }

    // Si las credenciales son correctas, genera un token JWT con la información del usuario
    const token = jwt.sign(
      { id: admin._id, isAdmin: admin.isAdmin }, // Carga útil del token con el ID del usuario y el rol de administrador
      process.env.JWT_SECRET as string, // Clave secreta para firmar el token (obtenida de las variables de entorno)
      { expiresIn: '1d' } // Expiración del token en 1 día
    );

    // Responde con el token y el estado de administrador
    res.status(200).json({ token, isAdmin: admin.isAdmin });
  } catch (error) {
    // Manejo de errores internos del servidor
    res.status(500).json({ message: 'Error al iniciar sesión', error });
  }
};
