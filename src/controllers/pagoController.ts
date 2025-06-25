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

// CORREGIDO: Crear preferencia para el frontend
export const crearPreferenciaAfiliado = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('=== CREAR PREFERENCIA ===');
        console.log('Datos recibidos:', req.body);

        const { 
            title, 
            description, 
            quantity, 
            unit_price, 
            total_amount,
            afiliadoId, 
            mesesPagados, 
            back_urls,
            auto_return 
        } = req.body;

        // Validaciones mejoradas
        if (!afiliadoId) {
            console.error('Error: afiliadoId no proporcionado');
            res.status(400).json({ 
                success: false,
                error: "ID de afiliado es requerido" 
            });
            return;
        }

        if (!mesesPagados || !Array.isArray(mesesPagados) || mesesPagados.length === 0) {
            console.error('Error: mesesPagados inválido', mesesPagados);
            res.status(400).json({ 
                success: false,
                error: "Debe seleccionar al menos un mes para pagar" 
            });
            return;
        }

        if (!title || !quantity || !unit_price) {
            console.error('Error: Datos de pago incompletos', { title, quantity, unit_price });
            res.status(400).json({ 
                success: false,
                error: "Datos de pago incompletos" 
            });
            return;
        }

        // Buscar afiliado
        const afiliado = await Afiliado.findById(afiliadoId);
        if (!afiliado) {
            console.error(`Error: Afiliado no encontrado con ID ${afiliadoId}`);
            res.status(404).json({ 
                success: false,
                error: "Afiliado no encontrado" 
            });
            return;
        }

        // Formatear meses pagados
        const mesesPagadosFormateados = mesesPagados.map((mes: any) => {
            if (mes.fecha) {
                return {
                    nombre: mes.nombre,
                    fecha: new Date(mes.fecha).toISOString()
                };
            }
            return {
                nombre: mes.nombre || 'Mes',
                fecha: new Date(mes).toISOString()
            };
        });

        // Crear cuerpo de la preferencia
        const preferenceBody = {
            items: [
                {
                    id: '1',
                    title: title,
                    quantity: Number(quantity),
                    unit_price: Number(unit_price),
                    currency_id: "PEN",
                    description: description || `Pago de membresía para ${afiliado.nombre}`
                }
            ],
            back_urls: {
                success: back_urls?.success || `${process.env.FRONTEND_URL}/sistema?status=success`,
                failure: back_urls?.failure || `${process.env.FRONTEND_URL}/sistema?status=failure`,
                pending: back_urls?.pending || `${process.env.FRONTEND_URL}/sistema?status=pending`
            },
            auto_return: auto_return || "approved",
            notification_url: `${process.env.BACKEND_URL}/api/afiliados/webhook-pago`,
            metadata: {
                afiliadoId: afiliadoId,
                mesesPagados: JSON.stringify(mesesPagadosFormateados)
            }
        };

        console.log('Cuerpo de preferencia:', JSON.stringify(preferenceBody, null, 2));

        // Crear preferencia en MercadoPago
        const preference = new Preference(client);
        const result = await preference.create({ body: preferenceBody });

        console.log('Preferencia creada:', { id: result.id, init_point: result.init_point });

        // Crear registro de pago pendiente
        const nuevoPago = new PagoAfiliado({
            afiliado: afiliadoId,
            mesesPagados: mesesPagadosFormateados.map((mes: any) => new Date(mes.fecha)),
            preferenceId: result.id,
            estado: 'pendiente',
            montoTotal: Number(total_amount) || (Number(quantity) * Number(unit_price))
        });

        await nuevoPago.save();
        console.log('Pago pendiente guardado:', nuevoPago._id);

        // Respuesta exitosa
        res.status(200).json({
            success: true,
            data: {
                id: result.id,
                preferenceId: result.id,
                init_point: result.init_point
            }
        });

    } catch (error) {
        console.error('=== ERROR AL CREAR PREFERENCIA ===');
        console.error('Error completo:', error);
        
        res.status(500).json({
            success: false,
            error: "Error al crear la preferencia de pago",
            mensaje: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

// CORREGIDO: Verificar pago cuando MercadoPago redirige
export const verificarPagoAfiliado = async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log('=== VERIFICAR PAGO ===');
        console.log('Query params:', req.query);

        const { payment_id, status, preference_id } = req.query;

        if (!payment_id || !status || !preference_id) {
            console.error('Parámetros incompletos:', { payment_id, status, preference_id });
            throw new Error('Parámetros incompletos');
        }

        console.log('Verificando pago:', { payment_id, status, preference_id });

        if (status === 'approved') {
            // Buscar el pago pendiente
            const pagoPendiente = await PagoAfiliado.findOne({ 
                preferenceId: preference_id,
                estado: 'pendiente'
            }).session(session);

            if (pagoPendiente) {
                console.log('Pago pendiente encontrado:', pagoPendiente._id);

                // Actualizar estado del pago
                pagoPendiente.estado = 'pagado';
                pagoPendiente.pagoId = payment_id as string;
                pagoPendiente.fechaPago = new Date();
                await pagoPendiente.save({ session });

                // Calcular la fecha más reciente de los meses pagados
                const fechaMasReciente = new Date(Math.max(
                    ...pagoPendiente.mesesPagados.map(fecha => new Date(fecha).getTime())
                ));

                // Actualizar afiliado
                await Afiliado.findByIdAndUpdate(
                    pagoPendiente.afiliado,
                    {
                        estadoPago: 'Al día',
                        ultimoMesPagado: fechaMasReciente
                    },
                    { session }
                );

                console.log('Pago verificado y afiliado actualizado');
            }

            await session.commitTransaction();
            session.endSession();

            const redirectUrl = `${process.env.FRONTEND_URL}/sistema?status=success`;
            console.log('Redirigiendo a:', redirectUrl);
            res.redirect(redirectUrl);
            return;

        } else {
            console.log('Pago no aprobado, status:', status);
            await session.abortTransaction();
            session.endSession();
            
            const errorUrl = `${process.env.FRONTEND_URL}/sistema?status=failure`;
            res.redirect(errorUrl);
            return;
        }

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error al verificar pago:', error);
        const errorUrl = `${process.env.FRONTEND_URL}/sistema?status=error`;
        res.redirect(errorUrl);
    }
};

// CORREGIDO: Webhook de MercadoPago
export const webhookPagoAfiliado = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('=== WEBHOOK RECIBIDO ===');
        console.log('Body completo:', JSON.stringify(req.body, null, 2));
        console.log('Headers:', req.headers);

        const { type, data } = req.body;

        if (type === 'payment') {
            const paymentId = data.id;
            console.log('Procesando pago ID:', paymentId);

            const payment = new Payment(client);
            const paymentDetails = await payment.get({ id: paymentId });

            console.log('Detalles del pago:', {
                id: paymentDetails.id,
                status: paymentDetails.status,
                metadata: paymentDetails.metadata
            });

            if (paymentDetails.status === 'approved') {
                // Buscar pago pendiente usando el preference_id del metadata
                const preferenceId = paymentDetails.metadata?.preference_id;
                
                if (!preferenceId) {
                    console.error('No se encontró preference_id en metadata');
                    res.status(200).send('Webhook procesado - Sin preference_id');
                    return;
                }

                const pagoPendiente = await PagoAfiliado.findOne({ 
                    preferenceId: preferenceId,
                    estado: 'pendiente'
                });

                if (pagoPendiente) {
                    console.log('Actualizando pago pendiente:', pagoPendiente._id);

                    // Actualizar estado de pago
                    pagoPendiente.estado = 'pagado';
                    pagoPendiente.pagoId = paymentId;
                    pagoPendiente.fechaPago = new Date();
                    await pagoPendiente.save();

                    // Calcular fecha más reciente
                    const fechaMasReciente = new Date(Math.max(
                        ...pagoPendiente.mesesPagados.map(fecha => new Date(fecha).getTime())
                    ));

                    // Actualizar afiliado
                    await Afiliado.findByIdAndUpdate(
                        pagoPendiente.afiliado,
                        {
                            estadoPago: 'Al día',
                            ultimoMesPagado: fechaMasReciente
                        }
                    );

                    console.log('Pago y afiliado actualizados exitosamente');
                } else {
                    console.log('No se encontró pago pendiente para preference_id:', preferenceId);
                }
            } else {
                console.log('Pago no aprobado, status:', paymentDetails.status);
            }
        }

        res.status(200).send('Webhook procesado');
    } catch (error) {
        console.error('=== ERROR EN WEBHOOK ===');
        console.error('Error completo:', error);
        res.status(500).send('Error en webhook');
    }
};

// CORREGIDO: Reservar pago (llamado desde el frontend)
export const reservarPago = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('=== RESERVAR PAGO ===');
        console.log('Datos recibidos:', req.body);

        const { afiliadoId, mesesPagados, preferenceId, paymentMethod } = req.body;

        if (!afiliadoId || !mesesPagados || !preferenceId) {
            res.status(400).json({
                success: false,
                error: "Datos incompletos para reservar pago"
            });
            return;
        }

        // Formatear meses pagados
        const mesesPagadosFormateados = mesesPagados.map((mes: any) => {
            if (mes.fecha) return new Date(mes.fecha);
            if (typeof mes === 'string') return new Date(mes);
            return new Date();
        });

        // Verificar si ya existe el pago
        let pagoPendiente = await PagoAfiliado.findOne({ 
            preferenceId: preferenceId,
            estado: 'pendiente' 
        });

        if (pagoPendiente) {
            console.log('Pago ya existe:', pagoPendiente._id);
            res.status(200).json({ 
                success: true,
                message: 'Pago ya reservado',
                reservaId: pagoPendiente._id 
            });
        } else {
            // Crear nuevo pago pendiente
            const nuevoPago = new PagoAfiliado({
                afiliado: afiliadoId,
                mesesPagados: mesesPagadosFormateados,
                preferenceId: preferenceId,
                estado: 'pendiente',
                montoTotal: mesesPagadosFormateados.length * 20
            });

            await nuevoPago.save();
            console.log('Nuevo pago reservado:', nuevoPago._id);
            
            res.status(200).json({ 
                success: true,
                message: 'Pago reservado exitosamente',
                reservaId: nuevoPago._id 
            });
        }

    } catch (error) {
        console.error('Error al reservar pago:', error);
        res.status(500).json({
            success: false,
            error: "Error al reservar el pago",
            mensaje: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

// Obtener estado de pago de un afiliado
export const obtenerEstadoPagoAfiliado = async (req: Request, res: Response): Promise<void> => {
    try {
        const { afiliadoId } = req.params;

        const afiliado = await Afiliado.findById(afiliadoId);
        if (!afiliado) {
            res.status(404).json({ 
                success: false,
                error: "Afiliado no encontrado" 
            });
            return;
        }

        // Obtener último pago
        const ultimoPago = await PagoAfiliado.findOne({ 
            afiliado: afiliadoId 
        }).sort({ fechaPago: -1 });

        res.status(200).json({ 
            success: true,
            data: {
                estadoPago: afiliado.estadoPago,
                ultimoMesPagado: afiliado.ultimoMesPagado,
                ultimoPago: ultimoPago ? {
                    estado: ultimoPago.estado,
                    mesesPagados: ultimoPago.mesesPagados,
                    montoTotal: ultimoPago.montoTotal,
                    fechaPago: ultimoPago.fechaPago
                } : null
            }
        });
    } catch (error) {
        console.error('Error al obtener estado de pago:', error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener el estado de pago" 
        });
    }
};