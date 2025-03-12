import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface IPayload {
  id: string;
  isAdmin: boolean;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'No autorizado: falta el token' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as IPayload;

    // Verificar si el token pertenece a un administrador
    if (!decoded.isAdmin) {
      res.status(403).json({ message: 'Acceso denegado: no eres administrador' });
      return;
    }

    // Continuar al siguiente middleware o controlador
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};
