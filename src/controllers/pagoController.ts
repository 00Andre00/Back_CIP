// nombre del archivo: pagoController.ts
import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import Afiliado from '../models/Afiliado';
import PagoAfiliado from '../models/PagoAfiliado';
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

export const crearPreferenciaAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Datos recibidos para crear preferencia:', req.body);

    const { title, quantity, price, afiliadoId, mesesPagados } = req.body;

    if (!afiliadoId || !mesesPagados || !Array.isArray(mesesPagados) || !title || !quantity || !price) {
      console.error('Error: Datos incompletos', { afiliadoId, mesesPagados, title, quantity, price });
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

    // Validar que las fechas no sean futuras más allá del mes actual
    const now = new Date();
    const maxFecha = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    if (mesesPagadosFormateados.some((fecha: Date) => fecha > maxFecha)) {
      res.status(400).json({ error: 'Los meses pagados no pueden ser futuros más allá del mes actual' });
      return;
    }

    const afiliado = await Afiliado.findById(afiliadoId);
    if (!afiliado) {
      console.error(`Error: Afiliado no encontrado con ID ${afiliadoId}`);
      res.status(404).json({ error: 'Afiliado no encontrado' });
      return;
    }

    const body = {
      items: [
        {
          id: '1',
          title,
          quantity: Number(quantity),
          unit_price: Number(price),
          currency_id: 'PEN',
          description: `Pago de membresía para ${afiliado.nombre}`,
        },
      ],
      back_urls: {
        success: `${process.env.BACKEND_URL}/api/afiliados/verificar-pago`,
        failure: `${process.env.FRONTEND_URL}/afiliados?status=failure`,
        pending: `${process.env.FRONTEND_URL}/afiliados?status=pending`,
      },
      metadata: {
        afiliadoId,
        mesesPagados: mesesPagadosFormateados,
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL}/api/afiliados/webhook-pago`,
    };

    console.log('Cuerpo de preferencia a enviar:', body);

    const preference = new Preference(client);
    const result = await preference.create({ body });

    console.log('Resultado de creación de preferencia:', result);

    const nuevoPago = new PagoAfiliado({
      afiliado: afiliadoId,
      mesesPagados: mesesPagadosFormateados,
      preferenceId: result.id,
      estado: 'pendiente',
      montoTotal: Number(quantity) * Number(price), // ✅ CORREGIDO: Ahora funciona porque el campo existe
    });
    await nuevoPago.save();

    res.json({
      id: result.id,
      init_point: result.init_point,
    });
  } catch (error) {
    console.error('Error detallado al crear preferencia de pago:', error);
    res.status(500).json({
      error: 'Error al crear la preferencia de pago',
      detalle: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const verificarPagoAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { payment_id, status, preference_id } = req.query;

    console.log('Verificando pago:', { payment_id, status, preference_id });

    if (status === 'approved' && preference_id) {
      const pagoPendiente = await PagoAfiliado.findOne({ preferenceId: preference_id }).populate('afiliado');

      if (pagoPendiente) {
        console.log('Pago encontrado:', pagoPendiente._id);
        
        pagoPendiente.estado = 'pagado';
        pagoPendiente.pagoId = payment_id as string;
        pagoPendiente.fechaPago = new Date();
        await pagoPendiente.save();

        const afiliado = await Afiliado.findById(pagoPendiente.afiliado);
        if (afiliado) {
          const mesesPagados = pagoPendiente.mesesPagados.map((fecha) => new Date(fecha));
          const fechaMasReciente = new Date(Math.max(...mesesPagados.map((fecha) => fecha.getTime())));
          
          afiliado.ultimoMesPagado = fechaMasReciente;
          
          // ✅ CORREGIDO: Usar la función del afiliadoController
          const datosCalculados = calcularEstadoYMesesAdeudados(afiliado);
          afiliado.estadoPago = datosCalculados.estadoPago;
          afiliado.mesesAdeudados = datosCalculados.mesesAdeudados;
          await afiliado.save();

          // Actualizar Mensualidad
          for (const fecha of mesesPagados) {
            const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
            const anio = fecha.getFullYear().toString();
            await Mensualidad.findOneAndUpdate(
              { afiliadoId: afiliado._id, mes, anio },
              { pagado: true, fechaPago: new Date() },
              { upsert: true }
            );
          }

          console.log('Afiliado actualizado:', {
            id: afiliado._id,
            estadoPago: afiliado.estadoPago,
            ultimoMesPagado: afiliado.ultimoMesPagado
          });
        }

        res.redirect(`${process.env.FRONTEND_URL}?status=success`);
      } else {
        console.log('Pago no encontrado para preference_id:', preference_id);
        res.redirect(`${process.env.FRONTEND_URL}?status=error`);
      }
    } else {
      console.log('Pago no aprobado o datos incompletos');
      res.redirect(`${process.env.FRONTEND_URL}?status=error`);
    }
  } catch (error) {
    console.error('Error al verificar pago:', error);
    res.redirect(`${process.env.FRONTEND_URL}?status=error`);
  }
};

export const obtenerEstadoPagoAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { afiliadoId } = req.params;

    const afiliado = await Afiliado.findById(afiliadoId);
    if (!afiliado) {
      res.status(404).json({ error: 'Afiliado no encontrado' });
      return;
    }

    const ultimoPago = await PagoAfiliado.findOne({ afiliado: afiliadoId }).sort({ fechaPago: -1 });

    res.json({
      estadoPago: afiliado.estadoPago,
      ultimoMesPagado: afiliado.ultimoMesPagado,
      ultimoPago: ultimoPago
        ? {
            estado: ultimoPago.estado,
            mesesPagados: ultimoPago.mesesPagados,
            montoTotal: ultimoPago.montoTotal,
            fechaPago: ultimoPago.fechaPago,
          }
        : null,
    });
  } catch (error) {
    console.error('Error al obtener estado de pago:', error);
    res.status(500).json({ error: 'Error al obtener el estado de pago' });
  }
};

export const webhookPagoAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Webhook recibido:', req.body);
    const { type, data } = req.body;

    if (type === 'payment') {
      const paymentId = data.id;
      const payment = new Payment(client);
      const paymentDetails = await payment.get({ id: paymentId });

      console.log('Detalles del pago:', {
        id: paymentDetails.id,
        status: paymentDetails.status,
        // ✅ CORREGIDO: Acceder correctamente al metadata
        afiliadoId: paymentDetails.metadata?.afiliadoId,
      });

      if (paymentDetails.status === 'approved') {
        // ✅ CORREGIDO: Buscar usando el afiliadoId del metadata
        const afiliadoId = paymentDetails.metadata?.afiliadoId;
        
        if (afiliadoId) {
          const pagoPendiente = await PagoAfiliado.findOne({
            afiliado: afiliadoId,
            estado: 'pendiente',
          }).sort({ fechaCreacion: -1 }); // Obtener el más reciente

          if (pagoPendiente) {
            console.log('Pago pendiente encontrado:', {
              id: pagoPendiente._id,
              afiliadoId: pagoPendiente.afiliado,
              mesesPagados: pagoPendiente.mesesPagados,
            });

            pagoPendiente.estado = 'pagado';
            pagoPendiente.pagoId = paymentId.toString();
            pagoPendiente.fechaPago = new Date();
            await pagoPendiente.save();

            const afiliado = await Afiliado.findById(pagoPendiente.afiliado);
            if (afiliado) {
              const mesesPagados = pagoPendiente.mesesPagados.map((fecha) => new Date(fecha));
              const fechaMasReciente = new Date(Math.max(...mesesPagados.map((fecha) => fecha.getTime())));
              
              afiliado.ultimoMesPagado = fechaMasReciente;
              const datosCalculados = calcularEstadoYMesesAdeudados(afiliado);
              afiliado.estadoPago = datosCalculados.estadoPago;
              afiliado.mesesAdeudados = datosCalculados.mesesAdeudados;
              await afiliado.save();

              // Actualizar Mensualidad
              for (const fecha of mesesPagados) {
                const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
                const anio = fecha.getFullYear().toString();
                await Mensualidad.findOneAndUpdate(
                  { afiliadoId: afiliado._id, mes, anio },
                  { pagado: true, fechaPago: new Date() },
                  { upsert: true }
                );
              }

              console.log('Afiliado actualizado desde webhook:', {
                id: afiliado._id,
                estadoPago: afiliado.estadoPago,
                ultimoMesPagado: afiliado.ultimoMesPagado,
              });
            }
          } else {
            console.log('No se encontró pago pendiente para afiliadoId:', afiliadoId);
          }
        } else {
          console.log('No se encontró afiliadoId en metadata');
        }
      } else {
        console.log('Pago no aprobado, status:', paymentDetails.status);
      }
    }

    res.status(200).send('Webhook recibido');
  } catch (error) {
    console.error('Error en webhook de pago:', error);
    res.status(500).send('Error en webhook');
  }
};

export const reservarPago = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Datos recibidos para reservar pago:', req.body);
    const { afiliadoId, mesesPagados, pagoId } = req.body;

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

    const now = new Date();
    const maxFecha = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    if (mesesPagadosFormateados.some((fecha: Date) => fecha > maxFecha)) {
      res.status(400).json({ error: 'Los meses pagados no pueden ser futuros más allá del mes actual' });
      return;
    }

    let pagoPendiente = await PagoAfiliado.findOne({
      preferenceId: pagoId,
      estado: 'pendiente',
    });

    if (pagoPendiente) {
      res.status(200).json({
        message: 'Pago pendiente confirmado',
        reservaId: pagoPendiente._id,
      });
    } else {
      const nuevoPago = new PagoAfiliado({
        afiliado: afiliadoId,
        mesesPagados: mesesPagadosFormateados,
        preferenceId: pagoId,
        estado: 'pendiente',
        montoTotal: mesesPagadosFormateados.length * 20,
      });
      await nuevoPago.save();

      res.status(200).json({
        message: 'Pago registrado exitosamente',
        reservaId: nuevoPago._id,
      });
    }
  } catch (error) {
    console.error('Error al reservar pago:', error);
    res.status(500).json({
      error: 'Error al reservar el pago',
      detalle: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

// ✅ FUNCIÓN COPIADA de tu afiliadoController que funciona
const calcularMesesEntreFechas = (fechaInicio: Date, fechaFin: Date = new Date()): number => {
  let meses = (fechaFin.getFullYear() - fechaInicio.getFullYear()) * 12;
  meses += fechaFin.getMonth() - fechaInicio.getMonth();
  if (fechaInicio.getDate() > fechaFin.getDate()) {
    meses -= 1;
  }
  return Math.max(0, meses);
};

const calcularEstadoYMesesAdeudados = (afiliado: any): { estadoPago: string; mesesAdeudados: number } => {
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