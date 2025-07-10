// nombre de archivo: emailService.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { generarPDFCertificadoHabilidad } from './pdfService';
import fs from 'fs';

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
  _id: string;  // Agregar el certificadoId
}

export const enviarCorreoCertificadoHabilidad = async (
  usuario: { nombre: string; apellido: string; email: string },
  certificadoData: CertificadoHabilidad
) => {
  // Ahora pasamos el certificado._id (el ID del certificado) para generar el QR en el PDF
  const pdfPath = await generarPDFCertificadoHabilidad(
    certificadoData.ingeniero,
    certificadoData.fechaVigencia,
    certificadoData._id // Pasamos el certificadoId para generar el QR
  );

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: usuario.email,
    subject: 'Certificado de Habilidad - Colegio de Ingenieros del Perú',
    text: `Estimado/a Ing. ${usuario.nombre} ${usuario.apellido},\n\nAdjuntamos su Certificado de Habilidad emitido por el Colegio de Ingenieros del Perú.\n\nEste documento acredita su colegiatura y habilitación profesional hasta la fecha indicada en el certificado.\n\nAtentamente,\nColegio de Ingenieros del Perú`,
    attachments: [
      {
        filename: `Certificado_Habilidad_${certificadoData.ingeniero.apellidos}.pdf`,
        path: pdfPath,
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    fs.unlinkSync(pdfPath); // Eliminar el archivo después de enviarlo
    return info;
  } catch (error) {
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath); // Eliminar el archivo en caso de error
    }
    throw error;
  }
};