import { Request, Response } from 'express';
import Afiliado, { IAfiliadoDocument } from '../models/Afiliado';

// Crear un nuevo afiliado
export const crearAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, dni, correo, especialidad, cipNumero, consejoDepartamental } = req.body;

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

    // Crear nuevo afiliado (sin generación de código CIP)
    const nuevoAfiliado = new Afiliado({
      nombre,
      dni,
      correo,
      especialidad,
      cipNumero,
      consejoDepartamental
    });

    // Guardar afiliado en la base de datos
    const afiliadoGuardado = await nuevoAfiliado.save();

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
export const obtenerAfiliados = async (req: Request, res: Response): Promise<void> => {
  try {
    const afiliados = await Afiliado.find().sort({ nombre: 1 });
    
    res.status(200).json({
      success: true,
      mensaje: 'Afiliados obtenidos correctamente',
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
    const { id } = req.params;
    
    const afiliado = await Afiliado.findById(id);
    
    if (!afiliado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      mensaje: 'Afiliado obtenido correctamente',
      data: afiliado
    });
  } catch (error) {
    console.error('Error al obtener afiliado por ID:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener el afiliado',
      error: (error as Error).message
    });
  }
};

// Actualizar información de afiliación
export const actualizarInfoAfiliacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { mesesAfiliacion, mesInicio, estadoPago } = req.body;
    
    const afiliado = await Afiliado.findById(id);
    
    if (!afiliado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado'
      });
      return;
    }
    
    // Actualizar campos relacionados con la afiliación
    afiliado.mesesAfiliacion = mesesAfiliacion;
    
    // Si mesInicio es null, mantener el valor actual
    if (mesInicio !== null) {
      afiliado.mesInicio = new Date(mesInicio);
    }
    
    afiliado.estadoPago = estadoPago;
    
    // Guardar cambios
    const afiliadoActualizado = await afiliado.save();
    
    res.status(200).json({
      success: true,
      mensaje: 'Información de afiliación actualizada correctamente',
      data: afiliadoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar información de afiliación:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al actualizar la información de afiliación',
      error: (error as Error).message
    });
  }
};

// Obtener estado de afiliación
export const obtenerEstadoAfiliacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const afiliado = await Afiliado.findById(id).select('mesesAfiliacion mesInicio estadoPago');
    
    if (!afiliado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      mensaje: 'Estado de afiliación obtenido correctamente',
      data: {
        mesesAfiliacion: afiliado.mesesAfiliacion,
        mesInicio: afiliado.mesInicio,
        estadoPago: afiliado.estadoPago
      }
    });
  } catch (error) {
    console.error('Error al obtener estado de afiliación:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener el estado de afiliación',
      error: (error as Error).message
    });
  }
};

// Eliminar un afiliado
export const eliminarAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const afiliadoEliminado = await Afiliado.findByIdAndDelete(id);
    
    if (!afiliadoEliminado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      mensaje: 'Afiliado eliminado correctamente',
      data: afiliadoEliminado
    });
  } catch (error) {
    console.error('Error al eliminar afiliado:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al eliminar el afiliado',
      error: (error as Error).message
    });
  }
};