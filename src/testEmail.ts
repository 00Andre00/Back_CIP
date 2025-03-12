import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'tu_destinatario@example.com',
    subject: 'Prueba de nodemailer',
    text: 'Este es un correo de prueba enviado usando nodemailer.',
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.error('Error al enviar el correo:', error);
    }
    console.log('Correo enviado correctamente:', info.response);
});
