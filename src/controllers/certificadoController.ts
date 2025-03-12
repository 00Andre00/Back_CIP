import { Request, Response } from 'express';
import UsuarioNormal from '../models/UsuarioNormal';
import Certificado from '../models/Certificado';
import CompraCertificado from '../models/CompraCertificado';
import { enviarCorreoCertificado } from '../utils/emailService';

// Crea un certificado y lo vincula a un usuario
export const crearCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dni, ...certData } = req.body;

    // Busca al usuario por su DNI
    const usuario = await UsuarioNormal.findOne({ dni });
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    // Crea un nuevo certificado con los datos proporcionados
    const nuevoCertificado = await Certificado.create(certData);

    // Asocia el certificado al usuario y guarda los cambios
    usuario.certificados.push(nuevoCertificado);
    await usuario.save();

    res.status(201).json({
      message: 'Certificado creado correctamente',
      certificado: nuevoCertificado,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({ message: 'Error interno del servidor', error: errorMessage });
  }
};

// Registra una compra y envía el certificado por correo electrónico
export const registrarCompraYEnviarCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { certificadoId, email, dni } = req.body;

    // Busca el certificado por su ID
    const certificado = await Certificado.findById(certificadoId);
    if (!certificado) {
      res.status(404).json({ message: 'Certificado no encontrado' });
      return;
    }

    // Busca al usuario por su DNI
    const usuario = await UsuarioNormal.findOne({ dni });
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    // Registra la compra del certificado
    await CompraCertificado.create({
      usuarioId: usuario._id,
      certificadoId: certificado._id,
      email,
    });

    // Envía el certificado por correo
    await enviarCorreoCertificado(
      { nombre: usuario.nombre, apellido: usuario.apellido, email },
      certificado
    );

    res.status(201).json({
      message: 'Compra registrada y certificado enviado correctamente',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({ message: 'Error interno del servidor', error: errorMessage });
  }
};

// Busca certificados asociados a un usuario mediante su DNI
export const buscarCertificadosPorDni = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dni } = req.params;

    // Busca al usuario por su DNI y obtiene sus certificados
    const usuario = await UsuarioNormal.findOne({ dni }).populate('certificados');
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    // Obtiene las compras de certificados realizadas por el usuario
    const compras = await CompraCertificado.find({ usuarioId: usuario._id }).populate('certificadoId');

    res.status(200).json({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      certificados: usuario.certificados,
      compras: compras.map(compra => ({
        certificadoId: compra.certificadoId,
        email: compra.email,
        fechaCompra: compra.fechaCompra,
      }))
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({ message: 'Error interno del servidor', error: errorMessage });
  }
};