// nombre del archivo: verificacionController.ts
import { Request, Response, NextFunction } from 'express';
import Certificado from '../models/Certificado';

export const verificarCertificado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: 'ID del certificado no proporcionado.' });
      return;
    }

    const certificado = await Certificado.findById(id).populate('afiliado', 'nombre cipNumero especialidad consejoDepartamental');

    if (!certificado || certificado.estado !== 'pagado') {
      res.status(404).json({ message: 'Certificado no válido o no encontrado.', valido: false });
      return;
    }

    res.json({
      message: 'Certificado oficial.',
      valido: true,
      certificado: {
        _id: certificado._id,
        fechaVigencia: certificado.fechaVigencia,
        fechaPago: certificado.fechaPago,
        afiliado: certificado.afiliado,
      },
    });
  } catch (error) {
    console.error('Error al verificar el certificado:', error);
    res.status(500).json({ message: 'Error interno del servidor.', valido: false });
  }
};