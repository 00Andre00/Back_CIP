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

interface DecodedToken {
  id: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

// Extender el tipo Request de Express para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      usuario?: DecodedToken;
    }
  }
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

// Middleware para verificar autenticación
export const verificarAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        mensaje: 'Acceso denegado. Token no proporcionado'
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as DecodedToken;
    
    // Añadir el usuario al request
    req.usuario = decoded;
    
    next();
  } catch (error) {
    console.error('Error en verificación de token:', error);
    res.status(401).json({
      success: false,
      mensaje: 'Token inválido o expirado'
    });
  }
};

// Middleware para verificar si es admin
export const verificarAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.usuario) {
      res.status(401).json({
        success: false,
        mensaje: 'Acceso denegado'
      });
      return;
    }

    if (!req.usuario.isAdmin) {
      res.status(403).json({
        success: false,
        mensaje: 'Acceso denegado. Se requieren privilegios de administrador'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error en verificación de admin:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error en la verificación de permisos'
    });
  }
};