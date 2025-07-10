import { Request, Response } from 'express';
import { enviarCorreoCertificadoHabilidad } from '../utils/emailService';

interface Ingeniero {
  nombres: string;
  apellidos: string;
  consejoDepartamental: string;
  registroCIP: string;
  especialidad: string;
  fechaIncorporacion: Date;
}

interface CertificadoRequest {
  nombre: string;
  apellido: string;
  email: string;
  ingeniero: Ingeniero;
  fechaVigencia: Date;
  certificadoId: string;  // Se agrega el campo certificadoId
}

export const enviarCertificadoHabilidad = async (req: Request, res: Response) => {
  try {
    const { nombre, apellido, email, ingeniero, fechaVigencia, certificadoId }: CertificadoRequest = req.body;

    if (!email || !nombre || !apellido || !ingeniero || !fechaVigencia || !certificadoId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan datos requeridos' 
      });
    }

    // Enviar certificado por correo
    await enviarCorreoCertificadoHabilidad(
      { nombre, apellido, email },
      { ingeniero, fechaVigencia, _id: certificadoId } // Se pasa el certificadoId
    );

    res.status(200).json({
      success: true,
      message: 'Certificado enviado correctamente al correo',
      data: { email, fechaVigencia, certificadoId }  // También se puede retornar el certificadoId en la respuesta
    });
    
  } catch (error) {
    console.error('Error al enviar certificado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el certificado',
      error: (error as Error).message
    });
  }
};