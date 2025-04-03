import { Request, Response } from 'express';
import Afiliado, { IAfiliadoDocument } from '../models/Afiliado';

export const verificarCipExistente = async (req: Request, res: Response) => {
  try {
    const { cip } = req.params;
    console.log('Backend - Verificando CIP:', cip);

    const afiliado = await Afiliado.findOne({ cipNumero: cip });
    const exists = !!afiliado;

    // Siempre devolver 200 con el estado exists
    res.status(200).json({
      exists,
      mensaje: exists ? 'El número CIP ya está registrado' : 'Número CIP disponible'
    });
  } catch (error) {
    console.error('Backend - Error al verificar CIP:', error);
    res.status(500).json({
      exists: false,
      mensaje: 'Error al verificar el número CIP',
      error: (error as Error).message
    });
  }
};

// Crear un nuevo afiliado
export const crearAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, dni, correo, especialidad, cipNumero, consejoDepartamental } = req.body;
    console.log('Backend - Intentando crear afiliado con CIP:', cipNumero);

    // Verificación previa
    const afiliadoExistente = await Afiliado.findOne({ cipNumero });

    if (afiliadoExistente) {
      console.log('Backend - CIP ya existe en BD');
      res.status(400).json({
        success: false,
        mensaje: `Ya existe un afiliado con el número CIP ${cipNumero}`
      });
      return;
    }

    // Verificar cada campo individualmente para dar mensajes más específicos
    const existeDNI = await Afiliado.findOne({ dni });
    if (existeDNI) {
      res.status(400).json({
        success: false,
        mensaje: `Ya existe un afiliado con el DNI ${dni}`
      });
      return;
    }

    const existeCorreo = await Afiliado.findOne({ correo });
    if (existeCorreo) {
      res.status(400).json({
        success: false,
        mensaje: `Ya existe un afiliado con el correo ${correo}`
      });
      return;
    }

    const existeCIP = await Afiliado.findOne({ cipNumero });
    if (existeCIP) {
      res.status(400).json({
        success: false,
        mensaje: `Ya existe un afiliado con el número CIP ${cipNumero}`
      });
      return;
    }

    // Crear nuevo afiliado
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
    await nuevoAfiliado.save();

    res.status(201).json({
      success: true,
      mensaje: 'Afiliado creado exitosamente',
      data: nuevoAfiliado
    });
  } catch (error) {
    console.error('Error al crear afiliado:', error);

    // Manejo de errores más específico
    if (error instanceof Error) {
      if ('code' in error && (error as any).code === 11000) {
        const campo = Object.keys((error as any).keyPattern)[0];
        const mensaje = `Ya existe un afiliado con ese ${campo === 'dni' ? 'DNI' : 
                        campo === 'correo' ? 'correo electrónico' : 
                        'número CIP'}`;
        
        res.status(400).json({
          success: false,
          mensaje
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      mensaje: 'Error al registrar el afiliado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};


// Obtener todos los afiliados
export const obtenerAfiliados = async (req: Request, res: Response): Promise<void> => {
  try {
    const afiliados = await Afiliado.find().sort({ nombre: 1 });

    // Recalcular el estado y los meses adeudados para cada afiliado
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

    // Calcular estado y meses adeudados actualizados
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

// Calcular meses entre dos fechas
// Función para calcular meses entre dos fechas (sin cambios)
const calcularMesesEntreFechas = (fechaInicio: Date, fechaFin: Date = new Date()): number => {
  let meses = (fechaFin.getFullYear() - fechaInicio.getFullYear()) * 12;
  meses += fechaFin.getMonth() - fechaInicio.getMonth();

  // Si el día de inicio es mayor que el día actual, se considera un mes menos
  if (fechaInicio.getDate() > fechaFin.getDate()) {
    meses -= 1;
  }

  return Math.max(0, meses); // Asegurar que no sea negativo
};

// Función para calcular el estado de pago y meses adeudados
// Función modificada para calcular el estado de pago y meses adeudados
const calcularEstadoYMesesAdeudados = (afiliado: IAfiliadoDocument): { estadoPago: string, mesesAdeudados: number } => {
  const fechaActual = new Date();

  // Si no hay último mes pagado, está pendiente y no tiene meses adeudados (nuevo afiliado)
  if (!afiliado.ultimoMesPagado) {
    return { estadoPago: 'Pendiente', mesesAdeudados: 0 };
  }

  // Crear una copia del último mes pagado para comparación
  const ultimoMesPagado = new Date(afiliado.ultimoMesPagado);

  // Calculamos meses adeudados desde el último mes pagado hasta hoy
  const mesesAdeudados = calcularMesesEntreFechas(
    new Date(ultimoMesPagado.getFullYear(), ultimoMesPagado.getMonth() + 1, 1), // Mes siguiente al último pago
    fechaActual
  );

  // Si mesesAdeudados es 0, está al día; de lo contrario, está pendiente
  return {
    estadoPago: mesesAdeudados === 0 ? 'Al día' : 'Pendiente',
    mesesAdeudados: mesesAdeudados
  };
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

    // Actualizar el último mes pagado
    if (ultimoMesPagado) {
      afiliado.ultimoMesPagado = new Date(ultimoMesPagado);
    } else {
      afiliado.ultimoMesPagado = null;
    }

    // Calcular meses adeudados
    if (afiliado.ultimoMesPagado) {
      const ultimoMes = new Date(afiliado.ultimoMesPagado);
      const fechaActual = new Date();

      // Calcular meses adeudados
      const mesesAdeudados = calcularMesesEntreFechas(
        new Date(ultimoMes.getFullYear(), ultimoMes.getMonth() + 1, 1),
        fechaActual
      );

      afiliado.mesesAdeudados = mesesAdeudados;
      // Estado basado únicamente en meses adeudados
      afiliado.estadoPago = mesesAdeudados === 0 ? 'Al día' : 'Pendiente';
    } else {
      afiliado.mesesAdeudados = 0;
      afiliado.estadoPago = 'Pendiente';
    }

    // Guardar cambios
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

    const afiliado = await Afiliado.findOne({ cipNumero });

    if (!afiliado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado'
      });
      return;
    }

    // Calcular estado y meses adeudados actualizados
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

