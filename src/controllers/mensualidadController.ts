// nombre: mensualidadController.ts
import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import Afiliado from '../models/Afiliado';
import Mensualidad from '../models/Mensualidad';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
}

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 1000 },
});

export const crearPreferenciaMensualidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, quantity, price, afiliadoId, mesesPagados } = req.body;

    if (!afiliadoId || !mesesPagados || !Array.isArray(mesesPagados) || !title || !quantity || !price) {
      res.status(400).json({ error: 'Datos de pago incompletos' });
      return;
    }

    const mesesPagadosFormateados = mesesPagados.map((m: any) => {
      if (m instanceof Date) return m;
      if (typeof m === 'string') {
        const fecha = new Date(m);
        if (isNaN(fecha.getTime())) throw new Error('Fecha inválida');
        return fecha;
      }
      if (m && m.fecha) {
        const fecha = new Date(m.fecha);
        if (isNaN(fecha.getTime())) throw new Error('Fecha inválida');
        return fecha;
      }
      throw new Error('Formato de fecha inválido');
    });

    const afiliado = await Afiliado.findById(afiliadoId);
    if (!afiliado) {
      res.status(404).json({ error: 'Afiliado no encontrado' });
      return;
    }

    // Validar que los meses sean futuros respecto a fechaInicioMensualidades
    const fechaInicioMensualidades = new Date(afiliado.fechaInicioMensualidades);
    const maxFecha = new Date(new Date().getFullYear(), new Date().getMonth() + 7, 0);
    if (
      mesesPagadosFormateados.some(
        (fecha: Date) => fecha < fechaInicioMensualidades || fecha > maxFecha
      )
    ) {
      res.status(400).json({
        error: 'Los meses pagados deben estar entre fechaInicioMensualidades y 6 meses en el futuro',
      });
      return;
    }

    const body = {
      items: [
        {
          id: 'mensualidad-1',
          title,
          quantity: Number(quantity),
          unit_price: Number(price),
          currency_id: 'PEN',
          description: `Pago de mensualidades para ${afiliado.nombre}`,
        },
      ],
      back_urls: {
        success: `${process.env.BACKEND_URL}/api/mensualidades/verificar-pago`,
        failure: `${process.env.FRONTEND_URL}/mensualidades?status=failure`,
        pending: `${process.env.FRONTEND_URL}/mensualidades?status=pending`,
      },
      metadata: {
        afiliadoId,
        mesesPagados: mesesPagadosFormateados,
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL}/api/mensualidades/webhook-pago`,
    };

    const preference = new Preference(client);
    const result = await preference.create({ body });

    // Crear documentos de Mensualidad como pendientes
    for (const fecha of mesesPagadosFormateados) {
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const anio = fecha.getFullYear().toString();
      await Mensualidad.findOneAndUpdate(
        { afiliadoId, mes, anio },
        { pagado: false, monto: price / quantity, fechaPago: null },
        { upsert: true }
      );
    }

    res.json({
      id: result.id,
      init_point: result.init_point,
    });
  } catch (error) {
    console.error('Error al crear preferencia de mensualidad:', error);
    res.status(500).json({
      error: 'Error al crear la preferencia de pago',
      detalle: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const reservarPagoMensualidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { afiliadoId, mesesPagados, pagoId } = req.body;

    if (!afiliadoId || !mesesPagados || !pagoId) {
      res.status(400).json({ error: 'Datos insuficientes para reservar pago' });
      return;
    }

    const mesesPagadosFormateados = mesesPagados.map((m: any) => {
      if (m instanceof Date) return m;
      if (typeof m === 'string') {
        const fecha = new Date(m);
        if (isNaN(fecha.getTime())) throw new Error('Fecha inválida');
        return fecha;
      }
      if (m && m.fecha) {
        const fecha = new Date(m.fecha);
        if (isNaN(fecha.getTime())) throw new Error('Fecha inválida');
        return fecha;
      }
      throw new Error('Formato de fecha inválido');
    });

    const afiliado = await Afiliado.findById(afiliadoId);
    if (!afiliado) {
      res.status(404).json({ error: 'Afiliado no encontrado' });
      return;
    }

    const fechaInicioMensualidades = new Date(afiliado.fechaInicioMensualidades);
    const maxFecha = new Date(new Date().getFullYear(), new Date().getMonth() + 7, 0);
    if (
      mesesPagadosFormateados.some(
        (fecha: Date) => fecha < fechaInicioMensualidades || fecha > maxFecha
      )
    ) {
      res.status(400).json({
        error: 'Los meses pagados deben estar entre fechaInicioMensualidades y 6 meses en el futuro',
      });
      return;
    }

    // Crear documentos de Mensualidad como pendientes si no existen
    for (const fecha of mesesPagadosFormateados) {
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const anio = fecha.getFullYear().toString();
      await Mensualidad.findOneAndUpdate(
        { afiliadoId, mes, anio },
        { pagado: false, monto: 20, fechaPago: null },
        { upsert: true }
      );
    }

    res.status(200).json({
      message: 'Pago de mensualidades registrado exitosamente',
      reservaId: pagoId,
    });
  } catch (error) {
    console.error('Error al reservar pago de mensualidad:', error);
    res.status(500).json({
      error: 'Error al reservar el pago',
      detalle: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const verificarPagoMensualidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { payment_id, status, preference_id } = req.query;

    if (status === 'approved' && preference_id) {
      const afiliadoId = (req.body.metadata?.afiliadoId || '').toString();
      const mesesPagados = req.body.metadata?.mesesPagados || [];

      if (!afiliadoId || !mesesPagados.length) {
        res.redirect(`${process.env.FRONTEND_URL}?status=error`);
        return;
      }

      const afiliado = await Afiliado.findById(afiliadoId);
      if (!afiliado) {
        res.redirect(`${process.env.FRONTEND_URL}?status=error`);
        return;
      }

      const mesesPagadosFormateados = mesesPagados.map((fecha: string) => new Date(fecha));
      for (const fecha of mesesPagadosFormateados) {
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const anio = fecha.getFullYear().toString();
        await Mensualidad.findOneAndUpdate(
          { afiliadoId, mes, anio },
          { pagado: true, fechaPago: new Date() },
          { upsert: true }
        );
      }

      const todasMensualidadesPagadas = await Mensualidad.find({
        afiliadoId,
        pagado: true,
      }).sort({ anio: -1, mes: -1 });

      if (todasMensualidadesPagadas.length > 0) {
        const ultimaMensualidadPagada = todasMensualidadesPagadas[0];
        afiliado.ultimoMesPagado = new Date(
          parseInt(ultimaMensualidadPagada.anio),
          parseInt(ultimaMensualidadPagada.mes) - 1
        );
        const datosCalculados = calcularEstadoYMesesAdeudados(afiliado);
        afiliado.estadoPago = datosCalculados.estadoPago;
        afiliado.mesesAdeudados = datosCalculados.mesesAdeudados;
        await afiliado.save();
      }

      res.redirect(`${process.env.FRONTEND_URL}?status=success`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}?status=error`);
    }
  } catch (error) {
    console.error('Error al verificar pago de mensualidad:', error);
    res.redirect(`${process.env.FRONTEND_URL}?status=error`);
  }
};

export const webhookPagoMensualidad = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Webhook recibido:', req.body);
    const { type, data } = req.body;

    if (type === 'payment') {
      const paymentId = data.id;
      const payment = new Payment(client);
      const paymentDetails = await payment.get({ id: paymentId });

      if (paymentDetails.status === 'approved') {
        const afiliadoId = paymentDetails.metadata?.afiliadoId;
        const mesesPagados = paymentDetails.metadata?.mesesPagados || [];

        if (!afiliadoId || !mesesPagados.length) {
          console.log('Datos de metadata inválidos');
          res.status(200).send('Webhook recibido');
          return;
        }

        const afiliado = await Afiliado.findById(afiliadoId);
        if (!afiliado) {
          console.log('Afiliado no encontrado');
          res.status(200).send('Webhook recibido');
          return;
        }

        const mesesPagadosFormateados = mesesPagados.map((fecha: string) => new Date(fecha));
        for (const fecha of mesesPagadosFormateados) {
          const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
          const anio = fecha.getFullYear().toString();
          await Mensualidad.findOneAndUpdate(
            { afiliadoId, mes, anio },
            { pagado: true, fechaPago: new Date() },
            { upsert: true }
          );
        }

        const todasMensualidadesPagadas = await Mensualidad.find({
          afiliadoId,
          pagado: true,
        }).sort({ anio: -1, mes: -1 });

        if (todasMensualidadesPagadas.length > 0) {
          const ultimaMensualidadPagada = todasMensualidadesPagadas[0];
          afiliado.ultimoMesPagado = new Date(
            parseInt(ultimaMensualidadPagada.anio),
            parseInt(ultimaMensualidadPagada.mes) - 1
          );
          const datosCalculados = calcularEstadoYMesesAdeudados(afiliado);
          afiliado.estadoPago = datosCalculados.estadoPago;
          afiliado.mesesAdeudados = datosCalculados.mesesAdeudados;
          await afiliado.save();
        }
      }

      res.status(200).send('Webhook recibido');
    } else {
      res.status(200).send('Webhook recibido');
    }
  } catch (error) {
    console.error('Error en webhook de mensualidad:', error);
    res.status(500).send('Error en webhook');
  }
};

// Reutilizamos la función de afiliadoController
const calcularEstadoYMesesAdeudados = (afiliado: any): { estadoPago: string; mesesAdeudados: number } => {
  const fechaActual = new Date();

  if (afiliado.ultimoMesPagado) {
    const ultimoMesPagado = new Date(afiliado.ultimoMesPagado);
    const mesesAdeudados =
      (fechaActual.getFullYear() - ultimoMesPagado.getFullYear()) * 12 +
      fechaActual.getMonth() -
      ultimoMesPagado.getMonth();
    return {
      estadoPago: mesesAdeudados <= 0 ? 'Al día' : 'Pendiente',
      mesesAdeudados: Math.max(0, mesesAdeudados),
    };
  }

  if (afiliado.fechaInicioPago) {
    const fechaInicio = new Date(afiliado.fechaInicioPago);
    const mesesAdeudados =
      (fechaActual.getFullYear() - fechaInicio.getFullYear()) * 12 +
      fechaActual.getMonth() -
      fechaInicio.getMonth();
    return {
      estadoPago: mesesAdeudados <= 0 ? 'Al día' : 'Pendiente',
      mesesAdeudados: Math.max(0, mesesAdeudados),
    };
  }

  return { estadoPago: 'Pendiente', mesesAdeudados: 0 };
};