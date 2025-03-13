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

//  Envía un correo electrónico al afiliado recién registrado con su código CIP

export const enviarCorreoRegistro = async (
 correoDestino: string, 
 nombre: string, 
 codigoCip: string
): Promise<void> => {
 try {
   // Contenido del correo
   const mailOptions = {
     from: `"CIP Registro" <${process.env.EMAIL_USER}>`,
     to: correoDestino,
     subject: 'Registro exitoso en el CIP - Código de afiliado',
     html: `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
         <h2 style="color: #333; text-align: center;">¡Bienvenido al CIP!</h2>
         <p>Estimado/a <strong>${nombre}</strong>,</p>
         <p>Nos complace informarle que su registro en el Colegio de Ingenieros del Perú ha sido procesado exitosamente.</p>
         <div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
           <p style="margin: 0; font-size: 14px;">Su código de afiliado es:</p>
           <h3 style="margin: 10px 0; color: #c00; font-size: 24px;">${codigoCip}</h3>
           <p style="margin: 0; font-size: 12px;">Guarde este código para futuras gestiones.</p>
         </div>
         <p>Este código es personal e intransferible. Le servirá para realizar trámites y acceder a servicios exclusivos para afiliados.</p>
         <p>Si tiene alguna consulta, no dude en contactarnos respondiendo a este correo o llamando a nuestro centro de atención.</p>
         <p style="margin-top: 30px;">Atentamente,</p>
         <p><strong>Equipo de Registro CIP</strong></p>
       </div>
     `
   };

   // Enviar el correo
   await transporter.sendMail(mailOptions);
   console.log(`Correo enviado exitosamente a ${correoDestino}`);
 } catch (error) {
   console.error('Error al enviar correo:', error);
   throw new Error('Error al enviar el correo electrónico');
 }
};
