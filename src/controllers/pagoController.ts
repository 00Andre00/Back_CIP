// nombre del archivo : pagoController.ts
import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import Afiliado from '../models/Afiliado';
import PagoAfiliado from '../models/PagoAfiliado';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { enviarCorreoCertificadoHabilidad } from '../utils/emailService'; 
dotenv.config();
if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
}

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 1000 }
});

export const crearPreferenciaAfiliado = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Datos recibidos para crear preferencia:', req.body);

        const { title, quantity, price, afiliadoId, mesesPagados } = req.body;

        // Validate input with more detailed checks
        if (!afiliadoId) {
            console.error('Error: afiliadoId no proporcionado');
            res.status(400).json({ error: "ID de afiliado es requerido" });
            return;
        }

        if (!mesesPagados || !Array.isArray(mesesPagados)) {
            console.error('Error: mesesPagados inválido', mesesPagados);
            res.status(400).json({ error: "Meses pagados son inválidos" });
            return;
        }

        if (!title || !quantity || !price) {
            console.error('Error: Datos de pago incompletos', { title, quantity, price });
            res.status(400).json({ error: "Datos de pago incompletos" });
            return;
        }

        // Convert mesesPagados to proper Date objects
        const mesesPagadosFormateados = mesesPagados.map(m => {
            // If it's already a Date object, use it
            if (m instanceof Date) return m;
            
            // If it's a string, try to parse it
            if (typeof m === 'string') {
                const fecha = new Date(m);
                return fecha.toISOString();
            }
            
            // If it's an object with a date property
            if (m && m.fecha) {
                const fecha = new Date(m.fecha);
                return fecha.toISOString();
            }
            
            // Fallback
            return new Date().toISOString();
        });

        // Find affiliate
        const afiliado = await Afiliado.findById(afiliadoId);
        if (!afiliado) {
            console.error(`Error: Afiliado no encontrado con ID ${afiliadoId}`);
            res.status(404).json({ error: "Afiliado no encontrado" });
            return;
        }

        const body = {
            items: [
                {
                    id: '1',
                    title,
                    quantity: Number(quantity),
                    unit_price: Number(price),
                    currency_id: "PEN",
                    description: `Pago de membresía para ${afiliado.nombre}`
                }
            ],
            back_urls: {
                success: `${process.env.BACKEND_URL}/api/afiliados/verificar-pago`,
                failure: `${process.env.FRONTEND_URL}/afiliados?status=failure`,
                pending: `${process.env.FRONTEND_URL}/afiliados?status=pending`
            },
            metadata: {
                afiliadoId,
                mesesPagados: mesesPagadosFormateados
            },
            auto_return: "approved",
            notification_url: `${process.env.BACKEND_URL}/api/afiliados/webhook-pago`
        };

        console.log('Cuerpo de preferencia a enviar:', body);

        const preference = new Preference(client);
        const result = await preference.create({ body });

        console.log('Resultado de creación de preferencia:', result);

        const nuevoPago = new PagoAfiliado({
            afiliado: afiliadoId,
            mesesPagados: mesesPagadosFormateados.map(m => new Date(m)),
            preferenceId: result.id,
            estado: 'pendiente',
            montoTotal: Number(quantity) * Number(price)
        });
        await nuevoPago.save();

        res.json({
            id: result.id,
            init_point: result.init_point
        });
    } catch (error) {
        console.error('Error detallado al crear preferencia de pago:', error);
        res.status(500).json({
            error: "Error al crear la preferencia de pago",
            detalle: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

export const verificarPagoAfiliado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { payment_id, status, preference_id } = req.query;

    if (status === 'approved' && preference_id) {
      const pagoPendiente = await PagoAfiliado.findOne({ preferenceId: preference_id });

      if (pagoPendiente) {
        // Verificar si pagoId ya existe antes de actualizar
        if (!pagoPendiente.pagoId) {
          pagoPendiente.pagoId = payment_id as string;  // Asignar pagoId si no existe
        }

        // Actualizar el estado del pago
        pagoPendiente.estado = 'pagado';
        pagoPendiente.fechaPago = new Date();
        await pagoPendiente.save();

        // Ahora obtenemos la información del afiliado para enviarle el certificado
        const afiliado = await Afiliado.findById(pagoPendiente.afiliado);
        if (afiliado) {
          const certificado = {
            ingeniero: {
              nombres: afiliado.nombre.split(' ')[0],
              apellidos: afiliado.nombre.split(' ')[1],
              consejoDepartamental: afiliado.consejoDepartamental,
              registroCIP: afiliado.cipNumero,
              especialidad: afiliado.especialidad,
              fechaIncorporacion: afiliado.fechaInicioPago
            },
            fechaVigencia: new Date(), // Establecer la fecha de vigencia del certificado
            _id: pagoPendiente._id?.toString() || '' // Agregar el certificadoId
          };

          // Enviar correo con el certificado adjunto
          await enviarCorreoCertificadoHabilidad({
            nombre: afiliado.nombre.split(' ')[0], 
            apellido: afiliado.nombre.split(' ')[1], 
            email: afiliado.correo
          }, certificado);

          // Redirigir al frontend
          const redirectUrl = `${process.env.FRONTEND_URL}`;
          res.redirect(redirectUrl);
        }
      }
    }
  } catch (error) {
    console.error('Error al verificar pago:', error);
    res.status(500).json({ error: 'Error al procesar el pago' });
  }
};

export const obtenerEstadoPagoAfiliado = async (req: Request, res: Response): Promise<void> => {
    try {
        const { afiliadoId } = req.params;

        const afiliado = await Afiliado.findById(afiliadoId);
        if (!afiliado) {
            res.status(404).json({ error: "Afiliado no encontrado" });
            return;
        }

        // Fetch latest pending or successful payment
        const ultimoPago = await PagoAfiliado.findOne({ 
            afiliado: afiliadoId 
        }).sort({ fechaPago: -1 });

        res.json({ 
            estadoPago: afiliado.estadoPago,
            ultimoMesPagado: afiliado.ultimoMesPagado,
            ultimoPago: ultimoPago ? {
                estado: ultimoPago.estado,
                mesesPagados: ultimoPago.mesesPagados,
                montoTotal: ultimoPago.montoTotal,
                fechaPago: ultimoPago.fechaPago
            } : null
        });
    } catch (error) {
        console.error('Error al obtener estado de pago:', error);
        res.status(500).json({ error: "Error al obtener el estado de pago" });
    }
};

// Nuevo controlador para webhook de Mercado Pago
// Modificación para el controlador webhookPagoAfiliado en el backend

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
                preferenceId: paymentDetails.metadata?.preference_id
            });

            if (paymentDetails.status === 'approved') {
                const pagoPendiente = await PagoAfiliado.findOne({ 
                    preferenceId: paymentDetails.metadata.preference_id,
                    estado: 'pendiente'
                });

                if (pagoPendiente) {
                    console.log('Pago pendiente encontrado:', {
                        id: pagoPendiente._id,
                        afiliadoId: pagoPendiente.afiliado,
                        mesesPagados: pagoPendiente.mesesPagados
                    });

                    // Actualizar estado de pago
                    pagoPendiente.estado = 'pagado';
                    pagoPendiente.pagoId = paymentId;
                    pagoPendiente.fechaPago = new Date();
                    await pagoPendiente.save();
                    console.log('Pago actualizado a estado pagado');

                    // Formatear fechas como objetos Date para garantizar el cálculo correcto
                    const mesesPagadosComoFechas = pagoPendiente.mesesPagados.map(fecha => {
                        if (fecha instanceof Date) return fecha;
                        return new Date(fecha);
                    });

                    // Obtener la fecha más reciente de los meses pagados
                    const fechaMasReciente = new Date(Math.max(
                        ...mesesPagadosComoFechas.map(fecha => fecha.getTime())
                    ));

                    console.log('Fecha más reciente calculada:', fechaMasReciente);

                    // Actualizar estado del afiliado con la fecha más reciente
                    const afiliadoActualizado = await Afiliado.findByIdAndUpdate(
                        pagoPendiente.afiliado,
                        {
                            estadoPago: 'Al día',
                            ultimoMesPagado: fechaMasReciente
                        },
                        { new: true } // Esta opción retorna el documento actualizado
                    );

                    console.log('Afiliado actualizado:', {
                        id: afiliadoActualizado?._id,
                        estadoPago: afiliadoActualizado?.estadoPago,
                        ultimoMesPagado: afiliadoActualizado?.ultimoMesPagado
                    });
                } else {
                    console.log('No se encontró pago pendiente para la preferencia:', paymentDetails.metadata?.preference_id);
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
            if (typeof m === 'string') return new Date(m);
            if (m && m.fecha) return new Date(m.fecha);
            return new Date();
        });

        // Buscar si ya existe un pago pendiente con el mismo preferenceId
        let pagoPendiente = await PagoAfiliado.findOne({ 
            preferenceId: pagoId,
            estado: 'pendiente' 
        });

        if (pagoPendiente) {
            // El pago ya existe, solo retornamos OK
            res.status(200).json({ 
                message: 'Pago pendiente confirmado',
                reservaId: pagoPendiente._id 
            });
        } else {
            // Si no existe, crear uno nuevo
            const nuevoPago = new PagoAfiliado({
                afiliado: afiliadoId,
                mesesPagados: mesesPagadosFormateados,
                preferenceId: pagoId,
                estado: 'pendiente',
                montoTotal: mesesPagadosFormateados.length * 20
            });
            await nuevoPago.save();
            
            res.status(200).json({ 
                message: 'Pago registrado exitosamente',
                reservaId: nuevoPago._id 
            });
        }

    } catch (error) {
        console.error('Error al reservar pago:', error);
        res.status(500).json({
            error: "Error al reservar el pago",
            detalle: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};