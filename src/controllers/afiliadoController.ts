// afiliadoController.ts
import { Request, Response } from 'express';
import Afiliado, { IAfiliadoDocument } from '../models/Afiliado';
import { enviarCorreoRegistro } from '../utils/emailService';

// Crear un nuevo afiliado
export const crearAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, dni, correo, especialidad, mensaje } = req.body;

    // Verificar si ya existe un afiliado con el mismo DNI o correo
    const afiliadoExistente = await Afiliado.findOne({ 
      $or: [{ dni }, { correo }] 
    });

    if (afiliadoExistente) {
      res.status(400).json({ 
        success: false, 
        mensaje: 'Ya existe un afiliado con ese DNI o correo electrónico' 
      });
      return;
    }

    // Crear nuevo afiliado (el código CIP se genera automáticamente en el middleware pre-save)
    const nuevoAfiliado = new Afiliado({
      nombre,
      dni,
      correo,
      especialidad,
      mensaje
    });

    // Guardar afiliado en la base de datos
    const afiliadoGuardado = await nuevoAfiliado.save();

    // Enviar correo con el código CIP
    await enviarCorreoRegistro(afiliadoGuardado.correo, afiliadoGuardado.nombre, afiliadoGuardado.codigoCip);

    res.status(201).json({
      success: true,
      mensaje: 'Afiliado registrado correctamente',
      data: afiliadoGuardado
    });
  } catch (error) {
    console.error('Error al crear afiliado:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al registrar el afiliado',
      error: (error as Error).message
    });
  }
};

// Obtener todos los afiliados
export const obtenerAfiliados = async (_req: Request, res: Response): Promise<void> => {
  try {
    const afiliados = await Afiliado.find().select('-__v');
    
    res.status(200).json({
      success: true,
      count: afiliados.length,
      data: afiliados
    });
  } catch (error) {
    console.error('Error al obtener afiliados:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener los afiliados',
      error: (error as Error).message
    });
  }
};

// Obtener un afiliado por ID
export const obtenerAfiliadoPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const afiliado = await Afiliado.findById(req.params.id).select('-__v');
    
    if (!afiliado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: afiliado
    });
  } catch (error) {
    console.error('Error al obtener afiliado:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener el afiliado',
      error: (error as Error).message
    });
  }
};

// Verificar código CIP
export const verificarCodigoCip = async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigoCip } = req.params;
    
    const afiliado = await Afiliado.findOne({ codigoCip }).select('-__v');
    
    if (!afiliado) {
      res.status(404).json({
        success: false,
        mensaje: 'Código CIP inválido o no encontrado'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: afiliado
    });
  } catch (error) {
    console.error('Error al verificar código CIP:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al verificar el código CIP',
      error: (error as Error).message
    });
  }
};