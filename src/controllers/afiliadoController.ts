// nombre del archivo: afiliadoController.ts
import { Request, Response } from 'express';
import Afiliado, { IAfiliadoDocument } from '../models/Afiliado';
import Mensualidad, { IMensualidadDocument } from '../models/Mensualidad';

interface MensualidadCrear {
  mes: string;
  anio: string;
  pagado: boolean;
}

export const verificarCipExistente = async (req: Request, res: Response) => {
  try {
    const { cip } = req.params;
    console.log('Backend - Verificando CIP:', cip);

    const afiliado = await Afiliado.findOne({ cipNumero: cip });
    const exists = !!afiliado;

    res.status(200).json({
      exists,
      mensaje: exists ? 'El número CIP ya está registrado' : 'Número CIP disponible',
    });
  } catch (error) {
    console.error('Backend - Error al verificar CIP:', error);
    res.status(500).json({
      exists: false,
      mensaje: 'Error al verificar el número CIP',
      error: (error as Error).message,
    });
  }
};

export const crearAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre,
      dni,
      correo,
      especialidad,
      cipNumero,
      consejoDepartamental,
      fechaInicioPago,
      fechaInicioMensualidades, // NUEVO CAMPO
      mensualidades = [],
    } = req.body;

    console.log('Backend - Intentando crear afiliado con CIP:', cipNumero);
    console.log('Backend - Mensualidades recibidas:', mensualidades);

    // Verificaciones de duplicados
    const existeDNI = await Afiliado.findOne({ dni });
    if (existeDNI) {
      res.status(400).json({
        success: false,
        mensaje: `Ya existe un afiliado con el DNI ${dni}`,
      });
      return;
    }

    const existeCorreo = await Afiliado.findOne({ correo });
    if (existeCorreo) {
      res.status(400).json({
        success: false,
        mensaje: `Ya existe un afiliado con el correo ${correo}`,
      });
      return;
    }

    const existeCIP = await Afiliado.findOne({ cipNumero });
    if (existeCIP) {
      res.status(400).json({
        success: false,
        mensaje: `Ya existe un afiliado con el número CIP ${cipNumero}`,
      });
      return;
    }

    // Validar fechas
    const now = new Date();
    const fechaInicioPagoDate = new Date(fechaInicioPago);
    const fechaInicioMensualidadesDate = new Date(fechaInicioMensualidades);
    if (isNaN(fechaInicioPagoDate.getTime()) || isNaN(fechaInicioMensualidadesDate.getTime())) {
      res.status(400).json({
        success: false,
        mensaje: 'Fechas inválidas',
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
      fechaInicioPago: fechaInicioPagoDate,
      fechaInicioMensualidades: fechaInicioMensualidadesDate, // NUEVO CAMPO
      estadoPago: 'Pendiente',
      mesesAdeudados: 0,
      ultimoMesPagado: null,
    });

    // Calcular estado inicial y meses adeudados
    const datosCalculados = calcularEstadoYMesesAdeudados(nuevoAfiliado);
    nuevoAfiliado.estadoPago = datosCalculados.estadoPago;
    nuevoAfiliado.mesesAdeudados = datosCalculados.mesesAdeudados;

    // Guardar el afiliado
    const afiliadoGuardado = await nuevoAfiliado.save();

    // Crear mensualidades si se especificaron
    let mensualidadesCreadas: IMensualidadDocument[] = [];
    if (mensualidades && mensualidades.length > 0) {
      try {
        // Validar mensualidades
        const maxFecha = new Date(now.getFullYear(), now.getMonth() + 7, 0);
        for (const m of mensualidades) {
          const fechaMensualidad = new Date(parseInt(m.anio), parseInt(m.mes) - 1);
          if (fechaMensualidad > maxFecha) {
            await Afiliado.findByIdAndDelete(afiliadoGuardado._id);
            res.status(400).json({
              success: false,
              mensaje: 'Las mensualidades no pueden ser posteriores a 6 meses desde ahora',
            });
            return;
          }
        }

        const mensualidadesParaCrear = mensualidades.map((mensualidad: MensualidadCrear) => ({
          afiliadoId: afiliadoGuardado._id,
          mes: mensualidad.mes,
          anio: mensualidad.anio,
          monto: 20.00,
          pagado: mensualidad.pagado || false,
          fechaPago: mensualidad.pagado ? new Date() : null,
        }));

        mensualidadesCreadas = (await Mensualidad.insertMany(mensualidadesParaCrear)) as IMensualidadDocument[];
        console.log(`Backend - Creadas ${mensualidadesCreadas.length} mensualidades`);

        // Actualizar ultimoMesPagado si hay mensualidades pagadas
        const mensualidadesPagadas = mensualidadesCreadas.filter((m) => m.pagado);
        if (mensualidadesPagadas.length > 0) {
          const ultimaMensualidadPagada = mensualidadesPagadas.reduce((ultima, actual) => {
            const fechaUltima = new Date(parseInt(ultima.anio), parseInt(ultima.mes) - 1);
            const fechaActual = new Date(parseInt(actual.anio), parseInt(actual.mes) - 1);
            return fechaActual > fechaUltima ? actual : ultima;
          });

          const ultimaFechaPago = new Date(parseInt(ultimaMensualidadPagada.anio), parseInt(ultimaMensualidadPagada.mes) - 1);
          afiliadoGuardado.ultimoMesPagado = ultimaFechaPago;

          const datosActualizados = calcularEstadoYMesesAdeudados(afiliadoGuardado);
          afiliadoGuardado.estadoPago = datosActualizados.estadoPago;
          afiliadoGuardado.mesesAdeudados = datosActualizados.mesesAdeudados;

          await afiliadoGuardado.save();
        }
      } catch (errorMensualidades) {
        console.error('Error al crear mensualidades:', errorMensualidades);
        await Afiliado.findByIdAndDelete(afiliadoGuardado._id);
        res.status(400).json({
          success: false,
          mensaje: 'Error al crear las mensualidades. Verifique que no existan mensualidades duplicadas.',
          error: errorMensualidades instanceof Error ? errorMensualidades.message : 'Error desconocido',
        });
        return;
      }
    }

    res.status(201).json({
      success: true,
      mensaje: mensualidadesCreadas.length > 0
        ? `Afiliado creado exitosamente con ${mensualidadesCreadas.length} mensualidades`
        : 'Afiliado creado exitosamente',
      data: {
        afiliado: afiliadoGuardado,
        mensualidades: mensualidadesCreadas,
      },
    });
  } catch (error) {
    console.error('Error al crear afiliado:', error);
    if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      const campo = Object.keys((error as any).keyPattern)[0];
      const mensaje =
        campo === 'dni'
          ? 'Ya existe un afiliado con ese DNI'
          : campo === 'correo'
          ? 'Ya existe un afiliado con ese correo electrónico'
          : 'Ya existe un afiliado con ese número CIP';
      res.status(400).json({
        success: false,
        mensaje,
      });
      return;
    }
    res.status(500).json({
      success: false,
      mensaje: 'Error al registrar el afiliado',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const obtenerAfiliados = async (req: Request, res: Response): Promise<void> => {
  try {
    const afiliados = await Afiliado.find().sort({ nombre: 1 });

    const afiliadosConMensualidades = await Promise.all(
      afiliados.map(async (afiliado) => {
        const mensualidades = await Mensualidad.find({ afiliadoId: afiliado._id }).sort({ anio: 1, mes: 1 });
        const datos = calcularEstadoYMesesAdeudados(afiliado);
        return {
          ...afiliado.toObject(),
          estadoPago: datos.estadoPago,
          mesesAdeudados: datos.mesesAdeudados,
          mensualidades,
        };
      })
    );

    res.status(200).json({
      success: true,
      mensaje: 'Afiliados obtenidos correctamente',
      data: afiliadosConMensualidades,
    });
  } catch (error) {
    console.error('Error al obtener afiliados:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener los afiliados',
      error: (error as Error).message,
    });
  }
};

export const obtenerAfiliadoPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const afiliado = await Afiliado.findById(id);

    if (!afiliado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado',
      });
      return;
    }

    const mensualidades = await Mensualidad.find({ afiliadoId: id }).sort({ anio: 1, mes: 1 });
    const datos = calcularEstadoYMesesAdeudados(afiliado);

    res.status(200).json({
      success: true,
      mensaje: 'Afiliado obtenido correctamente',
      data: {
        ...afiliado.toObject(),
        estadoPago: datos.estadoPago,
        mesesAdeudados: datos.mesesAdeudados,
        mensualidades,
      },
    });
  } catch (error) {
    console.error('Error al obtener afiliado por ID:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener el afiliado',
      error: (error as Error).message,
    });
  }
};

export const crearMensualidadesAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { mensualidades } = req.body;

    const afiliado = await Afiliado.findById(id);
    if (!afiliado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado',
      });
      return;
    }

    if (!mensualidades || mensualidades.length === 0) {
      res.status(400).json({
        success: false,
        mensaje: 'Debe especificar al menos una mensualidad',
      });
      return;
    }

    // Validar mensualidades
    const maxFecha = new Date(new Date().getFullYear(), new Date().getMonth() + 7, 0);
    for (const m of mensualidades) {
      const fechaMensualidad = new Date(parseInt(m.anio), parseInt(m.mes) - 1);
      if (fechaMensualidad > maxFecha) {
        res.status(400).json({
          success: false,
          mensaje: 'Las mensualidades no pueden ser posteriores a 6 meses desde ahora',
        });
        return;
      }
    }

    const mensualidadesParaCrear = mensualidades.map((mensualidad: MensualidadCrear) => ({
      afiliadoId: id,
      mes: mensualidad.mes,
      anio: mensualidad.anio,
      monto: 20.00,
      pagado: mensualidad.pagado || false,
      fechaPago: mensualidad.pagado ? new Date() : null,
    }));

    const mensualidadesCreadas = await Mensualidad.insertMany(mensualidadesParaCrear);

    const mensualidadesPagadas = mensualidadesCreadas.filter((m) => m.pagado);
    if (mensualidadesPagadas.length > 0) {
      const todasMensualidadesPagadas = await Mensualidad.find({
        afiliadoId: id,
        pagado: true,
      }).sort({ anio: -1, mes: -1 });

      if (todasMensualidadesPagadas.length > 0) {
        const ultimaMensualidadPagada = todasMensualidadesPagadas[0];
        afiliado.ultimoMesPagado = new Date(parseInt(ultimaMensualidadPagada.anio), parseInt(ultimaMensualidadPagada.mes) - 1);
        const datosActualizados = calcularEstadoYMesesAdeudados(afiliado);
        afiliado.estadoPago = datosActualizados.estadoPago;
        afiliado.mesesAdeudados = datosActualizados.mesesAdeudados;
        await afiliado.save();
      }
    }

    res.status(201).json({
      success: true,
      mensaje: `Se crearon ${mensualidadesCreadas.length} mensualidades exitosamente`,
      data: {
        afiliado,
        mensualidadesCreadas,
      },
    });
  } catch (error) {
    console.error('Error al crear mensualidades:', error);
    if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      res.status(400).json({
        success: false,
        mensaje: 'Ya existen mensualidades para uno o más de los meses seleccionados',
      });
      return;
    }
    res.status(500).json({
      success: false,
      mensaje: 'Error al crear las mensualidades',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const actualizarMensualidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mensualidadId } = req.params;
    const { pagado, fechaPago } = req.body;

    const mensualidad = await Mensualidad.findById(mensualidadId);
    if (!mensualidad) {
      res.status(404).json({
        success: false,
        mensaje: 'Mensualidad no encontrada',
      });
      return;
    }

    mensualidad.pagado = pagado;
    mensualidad.fechaPago = pagado ? (fechaPago ? new Date(fechaPago) : new Date()) : null;
    await mensualidad.save();

    const afiliado = await Afiliado.findById(mensualidad.afiliadoId);
    if (afiliado) {
      const mensualidadesPagadas = await Mensualidad.find({
        afiliadoId: mensualidad.afiliadoId,
        pagado: true,
      }).sort({ anio: -1, mes: -1 });

      if (mensualidadesPagadas.length > 0) {
        const ultimaMensualidadPagada = mensualidadesPagadas[0];
        afiliado.ultimoMesPagado = new Date(parseInt(ultimaMensualidadPagada.anio), parseInt(ultimaMensualidadPagada.mes) - 1);
      } else {
        afiliado.ultimoMesPagado = null;
      }

      const datosActualizados = calcularEstadoYMesesAdeudados(afiliado);
      afiliado.estadoPago = datosActualizados.estadoPago;
      afiliado.mesesAdeudados = datosActualizados.mesesAdeudados;
      await afiliado.save();
    }

    res.status(200).json({
      success: true,
      mensaje: 'Mensualidad actualizada correctamente',
      data: mensualidad,
    });
  } catch (error) {
    console.error('Error al actualizar mensualidad:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al actualizar la mensualidad',
      error: (error as Error).message,
    });
  }
};

const calcularMesesEntreFechas = (fechaInicio: Date, fechaFin: Date = new Date()): number => {
  let meses = (fechaFin.getFullYear() - fechaInicio.getFullYear()) * 12;
  meses += fechaFin.getMonth() - fechaInicio.getMonth();
  if (fechaInicio.getDate() > fechaFin.getDate()) {
    meses -= 1;
  }
  return Math.max(0, meses);
};

const calcularEstadoYMesesAdeudados = (afiliado: IAfiliadoDocument): { estadoPago: string; mesesAdeudados: number } => {
  const fechaActual = new Date();

  if (afiliado.ultimoMesPagado) {
    const ultimoMesPagado = new Date(afiliado.ultimoMesPagado);
    const mesesAdeudados = calcularMesesEntreFechas(
      new Date(ultimoMesPagado.getFullYear(), ultimoMesPagado.getMonth() + 1, 1),
      fechaActual
    );
    return {
      estadoPago: mesesAdeudados === 0 ? 'Al día' : 'Pendiente',
      mesesAdeudados,
    };
  }

  if (afiliado.fechaInicioPago) {
    const fechaInicio = new Date(afiliado.fechaInicioPago);
    const mesesAdeudados = calcularMesesEntreFechas(fechaInicio, fechaActual);
    return {
      estadoPago: mesesAdeudados === 0 ? 'Al día' : 'Pendiente',
      mesesAdeudados,
    };
  }

  return { estadoPago: 'Pendiente', mesesAdeudados: 0 };
};

export const actualizarInfoAfiliacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { ultimoMesPagado } = req.body;

    const afiliado = await Afiliado.findById(id);
    if (!afiliado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado',
      });
      return;
    }

    if (ultimoMesPagado) {
      afiliado.ultimoMesPagado = new Date(ultimoMesPagado);
    } else {
      afiliado.ultimoMesPagado = null;
    }

    const datosCalculados = calcularEstadoYMesesAdeudados(afiliado);
    afiliado.estadoPago = datosCalculados.estadoPago;
    afiliado.mesesAdeudados = datosCalculados.mesesAdeudados;

    const afiliadoActualizado = await afiliado.save();

    res.status(200).json({
      success: true,
      mensaje: 'Información de afiliación actualizada correctamente',
      data: afiliadoActualizado,
    });
  } catch (error) {
    console.error('Error al actualizar información de afiliación:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al actualizar la información de afiliación',
      error: (error as Error).message,
    });
  }
};

export const eliminarAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await Mensualidad.deleteMany({ afiliadoId: id });
    const afiliadoEliminado = await Afiliado.findByIdAndDelete(id);

    if (!afiliadoEliminado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado',
      });
      return;
    }

    res.status(200).json({
      success: true,
      mensaje: 'Afiliado y sus mensualidades eliminados correctamente',
      data: afiliadoEliminado,
    });
  } catch (error) {
    console.error('Error al eliminar afiliado:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al eliminar el afiliado',
      error: (error as Error).message,
    });
  }
};

export const obtenerAfiliadoPorCIP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cipNumero } = req.params;

    if (!cipNumero) {
      res.status(400).json({
        success: false,
        mensaje: 'El número CIP es requerido',
      });
      return;
    }

    const afiliado = await Afiliado.findOne({ cipNumero });

    if (!afiliado) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado',
      });
      return;
    }

    const mensualidades = await Mensualidad.find({ afiliadoId: afiliado._id }).sort({ anio: 1, mes: 1 });
    const datos = calcularEstadoYMesesAdeudados(afiliado);

    res.status(200).json({
      success: true,
      mensaje: 'Afiliado obtenido correctamente',
      data: {
        ...afiliado.toObject(),
        estadoPago: datos.estadoPago,
        mesesAdeudados: datos.mesesAdeudados,
        mensualidades,
      },
    });
  } catch (error) {
    console.error('Error al obtener afiliado por CIP:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener el afiliado',
      error: (error as Error).message,
    });
  }
};