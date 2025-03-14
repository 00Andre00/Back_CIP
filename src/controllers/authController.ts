import { Request, Response } from 'express'; // Importa los tipos de Request y Response de Express para tipado en TypeScript
import jwt from 'jsonwebtoken'; // Importa JWT para la generación de tokens de autenticación
import Usuario from '../models/Usuario'; // Importa el modelo de Usuario para interactuar con la base de datos
import bcrypt from 'bcrypt'; // Importa bcrypt para el cifrado de contraseñas

// Controlador para el inicio de sesión de administradores
export const loginAdmin = async (req: Request, res: Response) => {
  const { email, password } = req.body; // Extrae el email y password del cuerpo de la solicitud
  try {
    // Validación de campos
    if (!email || !password) {
      res.status(400).json({ message: 'Email y contraseña son requeridos' });
      return;
    }

    // Busca el usuario en la base de datos
    const usuario = await Usuario.findOne({ email }).select('+password');

    if (!usuario) {
      res.status(401).json({ message: 'Credenciales incorrectas' });
      return;
    }

    // Verifica la contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      res.status(401).json({ message: 'Credenciales incorrectas' });
      return;
    }

    // Verifica si es administrador
    if (!usuario.isAdmin) {
      res.status(403).json({ message: 'Acceso no autorizado' });
      return;
    }

    // Genera el token JWT
    const token = jwt.sign(
      { id: usuario._id, email: usuario.email, isAdmin: usuario.isAdmin },
      process.env.JWT_SECRET || 'tuClaveSecretaPorDefecto',
      { expiresIn: '24h' }
    );

    // Envía la respuesta
    res.status(200).json({
      success: true,
      token,
      isAdmin: usuario.isAdmin,
      user: {
        id: usuario._id,
        email: usuario.email,
        isAdmin: usuario.isAdmin,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};
