// nombre: verificacionController.ts
import { Request, Response, NextFunction } from 'express';
import Certificado from '../models/Certificado'; // Asegúrate de que la ruta sea correcta

export const verificarCertificado = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Se obtiene el id desde los parámetros de la ruta
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: 'ID del certificado no proporcionado.' });
      return;
    }

    const certificado = await Certificado.findById(id);

    if (!certificado) {
      res.status(404).json({ message: 'Certificado no encontrado.' });
      return;
    }

    res.json({ message: 'Certificado oficial.', certificado });
  } catch (error) {
    console.error('Error al verificar el certificado:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
