import { Request, Response } from 'express';
import Reserva from '../models/Reserva';

const HORARIOS_PRIVADOS = ["08:00", "09:00", "10:00", "11:00",
  "15:00", "16:00", "17:00", "18:00"];
  
const HORARIOS_PUBLICOS = ["07:00", "19:00"];

export const crearReserva = async (req: Request, res: Response): Promise<void> => {
  const { tipo, intencion, beneficiario, fecha, hora, email, comentario, pagoId } = req.body;

  if (!tipo || !intencion || !beneficiario || !fecha || !hora || !email || !pagoId) {
      res.status(400).json({ message: 'Todos los campos obligatorios deben estar completos.' });
      return;
  }

  try {
      const nuevaReserva = new Reserva({
          tipo,
          intencion,
          beneficiario,
          fecha,
          hora,
          email,
          comentario,
          estadoPago: 'pendiente',
          pagoId
      });

      await nuevaReserva.save();
      res.status(201).json({ 
          message: 'Reserva creada con éxito', 
          reserva: nuevaReserva 
      });
  } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : 'Error desconocido';
      res.status(500).json({ message: 'Error al crear la reserva', error: errorMessage });
  }
};

export const actualizarEstadoPago = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { estadoPago } = req.body;

  if (!estadoPago || !['pendiente', 'pagado'].includes(estadoPago)) {
    res.status(400).json({ message: 'El estado de pago debe ser "pendiente" o "pagado".' });
    return;
  }

  try {
    const reservaActualizada = await Reserva.findByIdAndUpdate(
      id,
      { estadoPago },
      { new: true }
    );

    if (!reservaActualizada) {
      res.status(404).json({ message: 'Reserva no encontrada.' });
      return;
    }

    res.status(200).json({ message: 'Estado de pago actualizado con éxito', reserva: reservaActualizada });
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'Error desconocido';
    res.status(500).json({ message: 'Error al actualizar el estado de pago', error: errorMessage });
  }
};

export const obtenerReservas = async (req: Request, res: Response): Promise<void> => {
  try {
    const reservas = await Reserva.find();
    res.status(200).json(reservas);
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'Error desconocido';
    res.status(500).json({ message: 'Error al obtener las reservas', error: errorMessage });
  }
};

export const obtenerHorariosDisponibles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fecha, tipo } = req.query;
    
    if (!fecha) {
      res.status(400).json({ message: 'Se requiere una fecha.' });
      return;
    }

    const fechaInicio = new Date(fecha as string);
    fechaInicio.setHours(0,0,0,0);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setHours(23,59,59,999);
    
    // Obtener la fecha y hora actual
    const ahora = new Date();

    const reservas = await Reserva.find({
      fecha: {
        $gte: fechaInicio,
        $lte: fechaFin
      }
    });

    let horarios = [];
    const esHoy = fechaInicio.toDateString() === ahora.toDateString();

    if (tipo === 'Privada') {
      // Para misas privadas, solo puede haber una reserva por horario
      horarios = HORARIOS_PRIVADOS.map(hora => {
        // Verificar si la hora ya pasó (solo para el día de hoy)
        const [horaNum, minNum] = hora.split(':').map(Number);
        const horaPasada = esHoy && (
          ahora.getHours() > horaNum || 
          (ahora.getHours() === horaNum && ahora.getMinutes() > 0)
        );
        
        return {
          hora,
          estado: horaPasada || reservas.some(reserva => 
            reserva.hora === hora && reserva.tipo === 'Privada'
          ) ? "ocupado" : "disponible"
        };
      });
    } else {
      // Para misas públicas
      horarios = HORARIOS_PUBLICOS.map(hora => {
        // Verificar si la hora ya pasó (solo para el día de hoy)
        const [horaNum, minNum] = hora.split(':').map(Number);
        const horaPasada = esHoy && (
          ahora.getHours() > horaNum || 
          (ahora.getHours() === horaNum && ahora.getMinutes() > 0)
        );
        
        return {
          hora,
          estado: horaPasada ? "ocupado" : "disponible"
        };
      });
    }

    res.status(200).json(horarios);
  } catch (error) {
    console.error('Error en obtenerHorariosDisponibles:', error);
    const errorMessage = (error instanceof Error) ? error.message : 'Error desconocido';
    res.status(500).json({ message: 'Error al obtener los horarios', error: errorMessage });
  }
};

export const eliminarReserva = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const reservaEliminada = await Reserva.findByIdAndDelete(id);

    if (!reservaEliminada) {
      res.status(404).json({ message: 'Reserva no encontrada.' });
      return;
    }

    res.status(200).json({ message: 'Reserva eliminada con éxito' });
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'Error desconocido';
    res.status(500).json({ message: 'Error al eliminar la reserva', error: errorMessage });
  }
};

export const limpiarReservasPendientes = async (): Promise<void> => {
  try {
    const tiempoLimite = new Date();
    tiempoLimite.setMinutes(tiempoLimite.getMinutes() - 30); // 30 minutos atrás

    const resultado = await Reserva.deleteMany({
      estadoPago: 'pendiente',
      createdAt: { $lt: tiempoLimite },
      tipo: 'Privada'
    });

    
  } catch (error) {
    console.error('Error al limpiar reservas pendientes:', error);
  }
};