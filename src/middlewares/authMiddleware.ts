import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extender la interfaz Request para incluir el usuario
interface RequestWithUser extends Request {
  user?: IPayload;
}

interface IPayload {
  id: string;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

export const authMiddleware = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No autorizado: falta el token' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as IPayload;

    // Agregar la información del usuario decodificada a la request
    req.user = decoded;

    // Continuar al siguiente middleware
    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    res.status(401).json({ 
      success: false,
      message: 'Token inválido o expirado' 
    });
  }
};

// Middleware para verificar rol de administrador
export const isAdmin = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  if (!req.user?.isAdmin) {
    res.status(403).json({ 
      success: false,
      message: 'Acceso denegado: se requieren permisos de administrador' 
    });
    return;
  }
  next();
};

// Middleware para verificar token expirado
export const checkTokenExpiration = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  const user = req.user as IPayload;
  
  if (user.exp && user.exp < Date.now() / 1000) {
    res.status(401).json({ 
      success: false,
      message: 'El token ha expirado' 
    });
    return;
  }
  
  next();
};
