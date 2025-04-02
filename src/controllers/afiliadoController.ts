import { Request, Response } from 'express';
import Afiliado, { IAfiliadoDocument } from '../models/Afiliado';

// Crear un nuevo afiliado
export const crearAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    let { nombre, dni, correo, especialidad, cipNumero, consejoDepartamental } = req.body;

    if (!dni || !/^\d{8}$/.test(dni)) {
      res.status(400).json({ 
        success: false, 
        mensaje: 'El DNI debe tener exactamente 8 dígitos numéricos' 
      });
      return;
    }

    if (!cipNumero) {
      res.status(400).json({ 
        success: false, 
        mensaje: 'El número CIP es requerido' 
      });
      return;
    }

    // 🔄 Normalización de campos clave
    dni = dni.trim();
    correo = correo.trim().toLowerCase();
    cipNumero = cipNumero.trim().toUpperCase();

    // Validar si ya existe un afiliado
    const condiciones: any[] = [];
    if (dni) condiciones.push({ dni });
    if (correo) condiciones.push({ correo });
    if (cipNumero) condiciones.push({ cipNumero });

    const afiliadoExistente = await Afiliado.findOne({ $or: condiciones });

    if (afiliadoExistente) {
      let campoDuplicado = '';
      if (afiliadoExistente.dni === dni) campoDuplicado = 'DNI';
      else if (afiliadoExistente.correo === correo) campoDuplicado = 'correo electrónico';
      else if (afiliadoExistente.cipNumero === cipNumero) campoDuplicado = 'número CIP';
    
      console.log('🚨 Ya existe un afiliado duplicado:', afiliadoExistente); // 🔍 Log para debug
    
      res.status(400).json({ 
        success: false, 
        mensaje: `Ya existe un afiliado con ese ${campoDuplicado}` 
      });
      return;
    }
    
    

    const nuevoAfiliado = new Afiliado({
      nombre,
      dni,
      correo,
      especialidad,
      cipNumero,
      consejoDepartamental,
      estadoPago: 'Pendiente',
      mesesAdeudados: 0,
      ultimoMesPagado: null
    });

    const afiliadoGuardado = await nuevoAfiliado.save();

    res.status(201).json({
      success: true,
      mensaje: 'Afiliado registrado correctamente',
      data: afiliadoGuardado
    });
  } catch (error) {
    console.error('Error al crear afiliado:', error);

    if (error instanceof Error && 'name' in error && error.name === 'ValidationError' && 'errors' in error) {
      const mensajes = Object.values((error as any).errors).map((e: any) => e.message);
      res.status(400).json({
        success: false,
        mensaje: 'Error de validación',
        errores: mensajes
      });
      return;
    }

    if (error instanceof Error && 'code' in error && (error as any).code === 11000 && 'keyValue' in error) {
      const campo = Object.keys((error as any).keyValue)[0];
      res.status(400).json({
        success: false,
        mensaje: `Ya existe un afiliado con ese ${campo === 'dni' ? 'DNI' : campo === 'correo' ? 'correo electrónico' : 'número CIP'}`
      });
      return;
    }

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

    const afiliadosActualizados = afiliados.map(afiliado => {
      const datos = calcularEstadoYMesesAdeudados(afiliado);
      return {
        ...afiliado.toObject(),
        estadoPago: datos.estadoPago,
        mesesAdeudados: datos.mesesAdeudados
      };
    });

    res.status(200).json({
      success: true,
      mensaje: 'Afiliados obtenidos correctamente',
      data: afiliadosActualizados
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

    const datos = calcularEstadoYMesesAdeudados(afiliado);

    res.status(200).json({
      success: true,
      mensaje: 'Afiliado obtenido correctamente',
      data: {
        ...afiliado.toObject(),
        estadoPago: datos.estadoPago,
        mesesAdeudados: datos.mesesAdeudados
      }
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

// Obtener un afiliado por número CIP
export const obtenerAfiliadoPorCIP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cipNumero } = req.params;

    if (!cipNumero) {
      res.status(400).json({
        success: false,
        mensaje: 'El número CIP es requerido'
      });
      return;
    }

    const afiliado = await Afiliado.findOne({ cipNumero: cipNumero.trim().toUpperCase() });

    if (!afiliado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado'
      });
      return;
    }

    const datos = calcularEstadoYMesesAdeudados(afiliado);

    res.status(200).json({
      success: true,
      mensaje: 'Afiliado obtenido correctamente',
      data: {
        ...afiliado.toObject(),
        estadoPago: datos.estadoPago,
        mesesAdeudados: datos.mesesAdeudados
      }
    });
  } catch (error) {
    console.error('Error al obtener afiliado por CIP:', error);
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
    const { ultimoMesPagado } = req.body;

    const afiliado = await Afiliado.findById(id);

    if (!afiliado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado'
      });
      return;
    }

    if (ultimoMesPagado) {
      afiliado.ultimoMesPagado = new Date(ultimoMesPagado);
    } else {
      afiliado.ultimoMesPagado = null;
    }

    if (afiliado.ultimoMesPagado) {
      const ultimoMes = new Date(afiliado.ultimoMesPagado);
      const fechaActual = new Date();

      const mesesAdeudados = calcularMesesEntreFechas(
        new Date(ultimoMes.getFullYear(), ultimoMes.getMonth() + 1, 1),
        fechaActual
      );

      afiliado.mesesAdeudados = mesesAdeudados;
      afiliado.estadoPago = mesesAdeudados === 0 ? 'Al día' : 'Pendiente';
    } else {
      afiliado.mesesAdeudados = 0;
      afiliado.estadoPago = 'Pendiente';
    }

    const afiliadoActualizado = await afiliado.save();

    res.status(200).json({
      success: true,
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

// Función para calcular meses entre dos fechas
const calcularMesesEntreFechas = (fechaInicio: Date, fechaFin: Date = new Date()): number => {
  let meses = (fechaFin.getFullYear() - fechaInicio.getFullYear()) * 12;
  meses += fechaFin.getMonth() - fechaInicio.getMonth();

  if (fechaInicio.getDate() > fechaFin.getDate()) {
    meses -= 1;
  }

  return Math.max(0, meses);
};

// Calcular estado de pago y meses adeudados
const calcularEstadoYMesesAdeudados = (afiliado: IAfiliadoDocument): { estadoPago: string, mesesAdeudados: number } => {
  const fechaActual = new Date();

  if (!afiliado.ultimoMesPagado) {
    return { estadoPago: 'Pendiente', mesesAdeudados: 0 };
  }

  const ultimoMesPagado = new Date(afiliado.ultimoMesPagado);

  const mesesAdeudados = calcularMesesEntreFechas(
    new Date(ultimoMesPagado.getFullYear(), ultimoMesPagado.getMonth() + 1, 1),
    fechaActual
  );

  return {
    estadoPago: mesesAdeudados === 0 ? 'Al día' : 'Pendiente',
    mesesAdeudados
  };
};
