import { Request, Response } from 'express';
import { enviarCorreoCertificadoHabilidad } from '../utils/emailService';
import { IIngeniero } from '../models/Certificado';

export const enviarCertificadoHabilidad = async (req: Request, res: Response) => {
  try {
    const { email, nombre, apellido, consejoDepartamental, registroCIP, especialidad, fechaIncorporacion } = req.body;
    
    if (!email || !nombre || !apellido || !consejoDepartamental || !registroCIP || !especialidad) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan datos requeridos' 
      });
    }
    
    // Calcular fecha de vigencia (3 meses a partir de hoy)
    const fechaVigencia = new Date();
    fechaVigencia.setMonth(fechaVigencia.getMonth() + 3);
    
    // Datos del ingeniero para el certificado
    const ingeniero = {
      nombres: nombre,
      apellidos: apellido,
      consejoDepartamental,
      registroCIP,
      especialidad,
      fechaIncorporacion: fechaIncorporacion ? new Date(fechaIncorporacion) : new Date()
    };
    
    // Datos del usuario para el correo
    const usuario = {
      nombre,
      apellido,
      email
    };
    
    // Enviar certificado por correo
    await enviarCorreoCertificadoHabilidad(usuario, {
      ingeniero,
      fechaVigencia
    });
    
    res.status(200).json({
      success: true,
      message: 'Certificado enviado correctamente al correo',
      data: {
        email,
        fechaVigencia
      }
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