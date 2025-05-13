import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { generarPDFCertificadoHabilidad  } from './pdfService';
import fs from 'fs';
import { IIngeniero } from '../models/Certificado';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface CertificadoHabilidad {
  ingeniero: {
    nombres: string;
    apellidos: string;
    consejoDepartamental: string;
    registroCIP: string;
    especialidad: string;
    fechaIncorporacion: Date;
  };
  fechaVigencia: Date;
}

export const enviarCorreoCertificadoHabilidad = async (
  usuario: { nombre: string; apellido: string; email: string },
  certificado: CertificadoHabilidad
) => {
  // Generate the PDF certificate
  const pdfPath = await generarPDFCertificadoHabilidad(
    certificado.ingeniero,
    certificado.fechaVigencia
  );

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: usuario.email,
    subject: 'Certificado de Habilidad - Colegio de Ingenieros del Perú',
    text: `Estimado/a Ing. ${usuario.nombre} ${usuario.apellido},\n\nAdjuntamos su Certificado de Habilidad emitido por el Colegio de Ingenieros del Perú.\n\nEste documento acredita su colegiatura y habilitación profesional hasta la fecha indicada en el certificado.\n\nAtentamente,\nColegio de Ingenieros del Perú`,
    attachments: [
      {
        filename: `Certificado_Habilidad_${certificado.ingeniero.apellidos}.pdf`,
        path: pdfPath,
      },
    ],
  };

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail(mailOptions);
    
    // Eliminar el archivo temporal
    fs.unlinkSync(pdfPath);
    
    return info;
  } catch (error) {
    // Eliminar el archivo en caso de error
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
    throw error;
  }
};