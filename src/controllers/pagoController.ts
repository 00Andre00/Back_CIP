import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import Afiliado from '../models/Afiliado';
import PagoAfiliado from '../models/PagoAfiliado';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
}

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 5000 }
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { payment_id, status, preference_id } = req.query;

        console.log('Verificando pago de afiliado:', { payment_id, status, preference_id });

        if (status === 'approved' && preference_id) {
            // Fetch payment details from Mercado Pago
            const payment = new Payment(client);
            const paymentDetails = await payment.get({ id: payment_id as string });

            const pagoPendiente = await PagoAfiliado.findOne({ 
                preferenceId: preference_id,
                estado: 'pendiente' 
            }).populate('afiliado').session(session);

            if (pagoPendiente && pagoPendiente.afiliado) {
                // Validate payment amount
                const montoAprobado = paymentDetails.transaction_amount;
                if (montoAprobado !== pagoPendiente.montoTotal) {
                    throw new Error('Monto de pago no coincide');
                }

                // Update payment status
                pagoPendiente.estado = 'pagado';
                pagoPendiente.pagoId = payment_id as string;
                pagoPendiente.fechaPago = new Date();
                await pagoPendiente.save({ session });

                // Update affiliate payment status
                const afiliado = pagoPendiente.afiliado as any;
                afiliado.estadoPago = 'Al día';
                afiliado.ultimoMesPagado = new Date(Math.max(...pagoPendiente.mesesPagados.map(m => new Date(m).getTime())));
                await afiliado.save({ session });

                await session.commitTransaction();
                session.endSession();

                // Redirect to success page
                const redirectUrl = `${process.env.FRONTEND_URL}/afiliados?status=success&paymentId=${payment_id}`;
                res.redirect(redirectUrl);
                return;
            }
        }

        // If payment verification fails
        await session.abortTransaction();
        session.endSession();

        const errorUrl = `${process.env.FRONTEND_URL}/afiliados?status=failure`;
        res.redirect(errorUrl);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error al verificar pago de afiliado:', error);
        const errorUrl = `${process.env.FRONTEND_URL}/afiliados?status=error`;
        res.redirect(errorUrl);
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
export const webhookPagoAfiliado = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type, data } = req.body;

        if (type === 'payment') {
            const paymentId = data.id;
            const payment = new Payment(client);
            const paymentDetails = await payment.get({ id: paymentId });

            // Lógica para manejar diferentes estados de pago
            if (paymentDetails.status === 'approved') {
                const pagoPendiente = await PagoAfiliado.findOne({ 
                    preferenceId: paymentDetails.metadata.preference_id,
                    estado: 'pendiente' 
                });

                if (pagoPendiente) {
                    // Actualizar estado de pago
                    pagoPendiente.estado = 'pagado';
                    pagoPendiente.pagoId = paymentId;
                    pagoPendiente.fechaPago = new Date();
                    await pagoPendiente.save();

                    // Actualizar estado del afiliado
                    await Afiliado.findByIdAndUpdate(pagoPendiente.afiliado, {
                        estadoPago: 'Al día',
                        ultimoMesPagado: new Date()
                    });
                }
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

        // Validate input
        if (!afiliadoId) {
            console.error('Error: afiliadoId no proporcionado');
            res.status(400).json({ error: "ID de afiliado es requerido" });
            return;
        }

        // Validate mesesPagados
        if (!mesesPagados || !Array.isArray(mesesPagados)) {
            console.error('Error: mesesPagados inválido', mesesPagados);
            res.status(400).json({ error: "Meses pagados son inválidos" });
            return;
        }

        // Convert mesesPagados to Date objects
        const mesesPagadosFormateados = mesesPagados.map(m => {
            // If it's already a Date object, use it
            if (m instanceof Date) return m;
            
            // If it's a string, try to parse it
            if (typeof m === 'string') {
                return new Date(m);
            }
            
            // If it's an object with a date property
            if (m && m.fecha) {
                return new Date(m.fecha);
            }
            
            // Fallback
            return new Date();
        });

        // Find affiliate
        const afiliado = await Afiliado.findById(afiliadoId);
        if (!afiliado) {
            console.error(`Error: Afiliado no encontrado con ID ${afiliadoId}`);
            res.status(404).json({ error: "Afiliado no encontrado" });
            return;
        }

        // Create a reservation record
        const reservaPago = new PagoAfiliado({
            afiliado: afiliadoId,
            mesesPagados: mesesPagadosFormateados,
            preferenceId: pagoId,
            estado: 'reservado',
            montoTotal: mesesPagadosFormateados.length * 20 // Assuming 20 per month
        });

        await reservaPago.save();

        res.status(200).json({ 
            message: 'Pago reservado exitosamente',
            reservaId: reservaPago._id 
        });

    } catch (error) {
        console.error('Error al reservar pago:', error);
        res.status(500).json({
            error: "Error al reservar el pago",
            detalle: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};