import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import Certificado from '../models/Certificado';
import Usuario from '../models/Usuario';
import CompraCertificado from '../models/CompraCertificado'; // Import the new model
import { enviarCorreoCertificado } from '../utils/emailService';

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
}

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 5000 }
});


export const crearPreferenciaCertificados = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, quantity, price, description, certificadosData } = req.body;

        if (!title || !quantity || !price) {
            res.status(400).json({ message: 'Datos incompletos para crear la preferencia' });
            return;
        }

        if (!certificadosData || !certificadosData.email || !certificadosData.dni || !certificadosData.certificadoIds) {
            res.status(400).json({ message: 'Se requieren datos del comprador (email, dni) y certificados' });
            return;
        }

        const mpItems = [{
            id: "certificados-pack",
            title: title,
            quantity: quantity,
            unit_price: Number(price),
            currency_id: "PEN",
            description: description || "Certificados parroquiales"
        }];

        const preferenceData = {
            items: mpItems,
            back_urls: {
                success: `${process.env.FRONTEND_URL || ''}/sistema?status=success`,
                failure: `${process.env.FRONTEND_URL || ''}/sistema?status=failure`,
                pending: `${process.env.FRONTEND_URL || ''}/sistema?status=pending`
            },
            auto_return: "approved",
            metadata: {
                dni: certificadosData.dni,
                email: certificadosData.email,
                certificadoIds: JSON.stringify(certificadosData.certificadoIds)
            },
            notification_url: `${process.env.BACKEND_URL || ''}/api/certificados/webhook`
        };

        const preference = new Preference(client);
        const result = await preference.create({ body: preferenceData });

        res.json({
            id: result.id,
            init_point: result.init_point
        });
    } catch (error) {
        console.error('Error al crear preferencia de pago para certificados:', error);
        res.status(500).json({
            message: 'Error al crear preferencia de pago',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

export const verificarPagoCertificados = async (req: Request, res: Response): Promise<void> => {
    try {
        // Estos parámetros vienen en la URL de retorno de MercadoPago
        const { payment_id, status, preference_id } = req.query;

        console.log('Verificando pago:', { payment_id, status, preference_id });

        // Si el pago fue aprobado y tenemos el ID de preferencia
        if (status === 'approved' && preference_id) {
            // Buscar los certificados asociados a este pago
            const certificados = await Certificado.find({ pagoId: preference_id.toString() });

            if (certificados && certificados.length > 0) {
                // Actualizar el estado de pago a "pagado"
                await Certificado.updateMany(
                    { pagoId: preference_id.toString() },
                    {
                        pagado: true,
                        fechaPago: new Date(),
                        fechaCompra: new Date()
                    }
                );

                // Buscar el usuario para obtener sus detalles
                const usuario = await Usuario.findOne({ dni: certificados[0].dni });
                
                if (usuario) {
                    // Para cada certificado, crear un registro en CompraCertificado
                    await Promise.all(certificados.map(async (certificado) => {
                        // Crear el registro de compra
                        await CompraCertificado.create({
                            usuarioId: usuario._id,
                            certificadoId: certificado._id,
                            email: usuario.email,
                            fechaCompra: new Date()
                        });
                        
                        // Enviar el correo con el certificado
                        return enviarCorreoCertificado(
                            {
                                nombre: usuario.nombre,
                                apellido: usuario.apellido,
                                email: usuario.email
                            },
                            certificado
                        );
                    }));
                }

                // Redirigir a la página de certificados con estado exitoso
                res.redirect(`${process.env.FRONTEND_URL || ''}/sistema?status=success`);
                return;
            }
        }

        // Si algo falló o no encontramos los certificados
        res.redirect(`${process.env.FRONTEND_URL || ''}/sistema?status=error`);
    } catch (error) {
        console.error('Error al verificar pago de certificados:', error);
        res.redirect(`${process.env.FRONTEND_URL || ''}/sistema?status=error`);
    }
};

export const verificarEstadoPagoCertificados = async (req: Request, res: Response): Promise<void> => {
    try {
        const { preference_id } = req.query;

        if (!preference_id) {
            res.status(400).json({ message: 'ID de preferencia no proporcionado' });
            return;
        }

        // Verificar si hay certificados asociados a esta preferencia
        const certificados = await Certificado.find({ pagoId: preference_id.toString() });

        if (certificados && certificados.length > 0) {
            // Si alguno está pagado, consideramos que el estado es aprobado
            const pagado = certificados.some(c => c.pagado === true);

            if (pagado) {
                res.json({ status: 'approved' });
            } else {
                res.json({ status: 'pending' });
            }
        } else {
            // Intentar verificar con MercadoPago
            try {
                const preference = new Preference(client);
                const preferenceData = await preference.get({ preferenceId: preference_id.toString() });

                const payment = new Payment(client);
                if (!preferenceData.id) {
                    throw new Error('Preference ID is undefined');
                }
                const paymentInfo = await payment.get({ id: preferenceData.id });
                if (paymentInfo.status === 'approved') {
                    res.json({ status: 'approved' });
                } else {
                    res.json({ status: 'pending' });
                }
            } catch (mpError) {
                console.error('Error al consultar estado en MercadoPago:', mpError);
                res.json({ status: 'unknown', message: 'No se pudo determinar el estado del pago' });
            }
        }
    } catch (error) {
        console.error('Error al verificar estado del pago:', error);
        res.status(500).json({
            message: 'Error al verificar estado del pago',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

export const procesarWebhookCertificados = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Webhook recibido:', JSON.stringify(req.body));
        const { action, data } = req.body;

        // Responder rápidamente para cumplir con los tiempos de respuesta de MercadoPago
        res.status(200).send('OK');

        if (action === 'payment.created' || action === 'payment.updated') {
            const paymentId = data.id;

            try {
                const payment = new Payment(client);
                const paymentInfo = await payment.get({ id: paymentId });

                if (paymentInfo.status === 'approved') {
                    const metadata = paymentInfo.metadata || {};
                    const email = metadata.email;
                    const dni = metadata.dni;

                    let certificadoIds: string[] = [];
                    try {
                        certificadoIds = JSON.parse(metadata.certificadoIds || '[]');
                    } catch (e) {
                        console.error('Error al parsear certificadoIds:', e);
                        return; // Terminamos aquí si no podemos obtener los IDs
                    }

                    if (!email || certificadoIds.length === 0) {
                        console.error('Metadatos incompletos:', { email, certificadoIds });
                        return; // Terminamos si faltan datos críticos
                    }

                    const certificados = await Certificado.find({ _id: { $in: certificadoIds } });

                    if (!certificados || certificados.length === 0) {
                        console.error('No se encontraron certificados con IDs:', certificadoIds);
                        return; // Terminamos si no hay certificados para actualizar
                    }

                    const usuario = await Usuario.findOne({ dni });

                    if (!usuario) {
                        console.error('No se encontró usuario con DNI:', dni);
                        return; // Terminamos si no hay usuario
                    }

                    // Primero actualizar estado de pago para evitar envíos duplicados
                    await Certificado.updateMany(
                        { _id: { $in: certificadoIds } },
                        {
                            $set: {
                                pagado: true,
                                fechaPago: new Date(),
                                fechaCompra: new Date(),
                                pagoId: paymentInfo.external_reference || paymentInfo.id
                            }
                        }
                    );

                    // Para cada certificado, crear un registro en CompraCertificado y enviar el correo
                    await Promise.all(certificados.map(async (certificado) => {
                        try {
                            // Crear registro de compra
                            await CompraCertificado.create({
                                usuarioId: usuario._id,
                                certificadoId: certificado._id,
                                email,
                                fechaCompra: new Date()
                            });
                            
                            // Enviar el correo con el certificado
                            await enviarCorreoCertificado(
                                {
                                    nombre: usuario.nombre,
                                    apellido: usuario.apellido,
                                    email
                                },
                                certificado
                            );
                        } catch (e) {
                            console.error('Error al procesar certificado:', certificado._id, e);
                        }
                    }));

                    console.log('Proceso de pago completado exitosamente para los certificados:', certificadoIds);
                }
            } catch (error) {
                console.error('Error procesando el pago en webhook:', error);
                // No respondemos con error porque ya enviamos 200 OK inicialmente
            }
        }
    } catch (error) {
        console.error('Error en webhook de certificados:', error);
        // Si no hemos respondido todavía, enviamos OK para que MP no reintente
        if (!res.headersSent) {
            res.status(200).send('Error processed');
        }
    }
};

export const completarCompraCertificados = async (req: Request, res: Response): Promise<void> => {
    try {
        const { dni, certificadoIds, email } = req.body;

        if (!dni || !certificadoIds || !email) {
            res.status(400).json({ message: 'Datos incompletos' });
            return;
        }

        const usuario = await Usuario.findOne({ dni });
        if (!usuario) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        // Si certificadoIds es un array, procesamos varios certificados
        const idsArray = Array.isArray(certificadoIds) ? certificadoIds : [certificadoIds];
        
        const certificados = await Certificado.find({ _id: { $in: idsArray } });
        if (!certificados || certificados.length === 0) {
            res.status(404).json({ message: 'Certificados no encontrados' });
            return;
        }

        // Actualizar cada certificado y registrar la compra
        const results = await Promise.all(certificados.map(async (certificado) => {
            // Marcar como pagado si aún no lo está
            if (!certificado.pagado) {
                certificado.pagado = true;
                certificado.fechaPago = new Date();
                certificado.fechaCompra = new Date();
                await certificado.save();
            }

            // Crear registro de compra
            await CompraCertificado.create({
                usuarioId: usuario._id,
                certificadoId: certificado._id,
                email,
                fechaCompra: new Date()
            });

            // Enviar el correo con el certificado
            await enviarCorreoCertificado(
                {
                    nombre: usuario.nombre,
                    apellido: usuario.apellido,
                    email
                },
                certificado
            );

            return certificado._id;
        }));

        res.status(200).json({
            message: 'Compra de certificados completada exitosamente',
            certificadoIds: results
        });
    } catch (error) {
        console.error('Error al completar compra de certificados:', error);
        res.status(500).json({
            message: 'Error al completar la compra',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};