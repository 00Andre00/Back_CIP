import mongoose from 'mongoose';
import connectDB from './config/db';
import Usuario from './models/Usuario';
import dotenv from 'dotenv';

dotenv.config();

const crearAdmin = async () => {
  try {
    await connectDB();

    const adminExistente = await Usuario.findOne({ email: 'admin@iglesia.com' });
    if (adminExistente) {
      console.log('El usuario admin ya existe');
      process.exit(0);
    }

    // No necesitas encriptar manualmente la contraseña, deja que Mongoose lo haga
    const admin = new Usuario({
      nombre: 'Admin',
      email: 'admin@iglesia.com',
      password: 'admin123',  // Contraseña en texto plano, Mongoose la encriptará automáticamente
      isAdmin: true
    });

    await admin.save();
    console.log('Usuario admin creado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error al crear el usuario admin:', error);
    process.exit(1);
  }
};

crearAdmin();
