import { Request, Response } from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import Reserva from '../models/Reserva';

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
        const { action, data } = req.body;

        // Solo procesamos notificaciones de pagos
        if (action === 'payment.created' || action === 'payment.updated') {
            const paymentId = data.id;
            
            // Obtener los detalles del pago de MercadoPago
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: paymentId });
            
            console.log('Payment Info:', JSON.stringify(paymentInfo, null, 2));
            // Obtener el ID de preferencia del pago
            const preferenceId = paymentInfo.external_reference || 
                     paymentInfo.metadata?.preference_id;
            
            if (preferenceId && paymentInfo.status === 'approved') {
                // Buscar la reserva por el ID de preferencia
                const reserva = await Reserva.findOne({ pagoId: preferenceId });
                
                if (reserva) {
                    // Actualizar el estado a pagado
                    await Reserva.findByIdAndUpdate(reserva._id, {
                        estadoPago: 'pagado'
                    });
                    
                    console.log(`Webhook: Pago aprobado para la reserva: ${reserva._id}`);
                }
            }
        }

        // Siempre responder con éxito al webhook
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error en webhook:', error);
        res.status(500).send('Error processing webhook');
    }
};