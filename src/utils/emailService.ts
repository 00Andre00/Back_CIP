import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { generarPDFPorTipo } from './pdfService';
import fs from 'fs';
import { ICertificado } from '../models/Certificado';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const enviarCorreoCertificado = async (
  usuario: { nombre: string; apellido: string; email: string },
  certificado: ICertificado
) => {
  // Convertir el documento Mongoose a un objeto plano y asegurar que _id sea una cadena
  const certificadoForPdf = {
    ...certificado.toObject(),
    _id: String(certificado._id)
  };

  // Generar el PDF según el tipo de certificado usando el objeto con _id en string
  const pdfPath = await generarPDFPorTipo(certificado.tipo, usuario, certificadoForPdf);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: usuario.email,
    subject: `Certificado de ${certificado.tipo}`,
    text: `Estimado/a ${usuario.nombre} ${usuario.apellido}, adjuntamos su certificado de ${certificado.tipo}.`,
    attachments: [
      {
        filename: `certificado_${certificado.tipo}.pdf`,
        path: pdfPath,
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);

  // Eliminar el archivo PDF una vez enviado
  fs.unlinkSync(pdfPath);
  return info;
};


