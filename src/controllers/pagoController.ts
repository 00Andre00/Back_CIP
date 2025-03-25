import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import Afiliado from '../models/Afiliado'; // Adjust the import path as needed
import PagoAfiliado from '../models/PagoAfiliado'; // Adjust the import path as needed

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
}

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 5000, idempotencyKey: 'abc' }
});

export const crearPreferenciaAfiliado = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
            throw new Error('Access token no configurado');
        }

        const { title, quantity, price, afiliadoId, mesesPagados } = req.body;

        // Buscar al afiliado
        const afiliado = await Afiliado.findById(afiliadoId);
        if (!afiliado) {
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
                success: `${process.env.BACKEND_URL || ''}/api/afiliados/verificar-pago`,
                failure: `${process.env.FRONTEND_URL || ''}/afiliados`,
                pending: `${process.env.FRONTEND_URL || ''}/afiliados`
            },
            metadata: {
                afiliadoId,
                mesesPagados
            },
            auto_return: "approved"
        };

        const preference = new Preference(client);
        const result = await preference.create({ body });

        // Crear un registro de pago pendiente
        const nuevoPago = new PagoAfiliado({
            afiliado: afiliadoId,
            mesesPagados,
            preferenceId: result.id,
            estado: 'pendiente'
        });
        await nuevoPago.save();

        res.json({
            id: result.id,
            init_point: result.init_point
        });
    } catch (error) {
        console.error('Error al crear preferencia de pago:', error);
        res.status(500).json({
            error: "Error al crear la preferencia de pago"
        });
    }
};

export const verificarPagoAfiliado = async (req: Request, res: Response): Promise<void> => {
    try {
        const { payment_id, status, preference_id } = req.query;

        console.log('Verificando pago de afiliado:', { payment_id, status, preference_id });

        if (status === 'approved' && preference_id) {
            // Buscar el pago pendiente
            const pagoPendiente = await PagoAfiliado.findOne({ 
                preferenceId: preference_id,
                estado: 'pendiente' 
            }).populate<{ afiliado: typeof Afiliado }>('afiliado');

            if (pagoPendiente && pagoPendiente.afiliado) {
                // Actualizar estado del pago
                pagoPendiente.estado = 'pagado';
                pagoPendiente.pagoId = payment_id as string;
                await pagoPendiente.save();

                // Actualizar estado de pago del afiliado
                const afiliado = pagoPendiente.afiliado as any;
                afiliado.estadoPago = 'Al día';
                afiliado.ultimoMesPagado = new Date();
                await afiliado.save();

                // Redirigir al frontend
                const redirectUrl = `${process.env.FRONTEND_URL || 'https://tudominio.com'}/afiliados?status=success`;
                console.log('Redirigiendo a:', redirectUrl);
                
                res.redirect(redirectUrl);
                return;
            }
        }

        // Si algo falló
        const errorUrl = `${process.env.FRONTEND_URL || 'https://tudominio.com'}/afiliados?status=failure`;
        console.log('Redirigiendo a error:', errorUrl);
        res.redirect(errorUrl);
    } catch (error) {
        console.error('Error al verificar pago de afiliado:', error);
        const errorUrl = `${process.env.FRONTEND_URL || 'https://tudominio.com'}/afiliados?status=error`;
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

        res.json({ 
            estadoPago: afiliado.estadoPago,
            ultimoMesPagado: afiliado.ultimoMesPagado
        });
    } catch (error) {
        console.error('Error al obtener estado de pago:', error);
        res.status(500).json({ error: "Error al obtener el estado de pago" });
    }
};