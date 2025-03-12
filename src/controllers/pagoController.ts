import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import Reserva from '../models/Reserva';

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
}

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 5000, idempotencyKey: 'abc' }
});

export const crearPreferencia = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
            throw new Error('Access token no configurado');
        }
  
        const { title, quantity, price, description, reservaData } = req.body;
  
        const body = {
            items: [
                {
                    id: '1',
                    title,
                    quantity: Number(quantity),
                    unit_price: Number(price),
                    currency_id: "PEN",
                    description
                }
            ],
            back_urls: {
              // Esta ruta va al backend para procesar el pago
              success: `${process.env.BACKEND_URL || ''}/api/pagos/verificar`,
              // Estas dos rutas van directamente al frontend, sin parámetros adicionales
              failure: `${process.env.FRONTEND_URL || ''}/misas`,
              pending: `${process.env.FRONTEND_URL || ''}/misas`
            },
            metadata: {
                ...reservaData
            },
            auto_return: "approved"
        };
  
        const preference = new Preference(client);
        const result = await preference.create({ body });
  
        res.json({
            id: result.id,
            init_point: result.init_point
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: "Error al crear la preferencia de pago"
        });
    }
  };

  export const verificarPago = async (req: Request, res: Response): Promise<void> => {
    try {
        // Estos parámetros vienen en la URL de retorno de MercadoPago
        const { payment_id, status, preference_id } = req.query;
        
        console.log('Verificando pago:', { payment_id, status, preference_id });
        console.log('URL de frontend:', process.env.FRONTEND_URL);
        
        // Si el pago fue aprobado y tenemos el ID de preferencia
        if (status === 'approved' && preference_id) {
            // Buscar la reserva asociada a este pago
            const reserva = await Reserva.findOne({ pagoId: preference_id });
            
            if (reserva) {
                // Actualizar el estado de pago a "pagado"
                await Reserva.findByIdAndUpdate(reserva._id, {
                    estadoPago: 'pagado'
                });
                
                // Usar una URL simple para la redirección, sin parámetros adicionales
                const redirectUrl = `${process.env.FRONTEND_URL || 'https://parroquiasdigitales.com'}/misas`;
                console.log('Redirigiendo a:', redirectUrl);
                
                // Opcionalmente, guardar el ID de reserva en una cookie para verificación en frontend
                res.cookie('reservaCompletada', reserva._id, { 
                    maxAge: 60000, // Cookie válida por 1 minuto
                    httpOnly: false, // Permitir acceso desde JavaScript
                    secure: process.env.NODE_ENV === 'production' // Solo HTTPS en producción
                });
                
                res.redirect(redirectUrl);
                return;
            }
        }
        
        // Si algo falló o no encontramos la reserva
        const errorUrl = `${process.env.FRONTEND_URL || 'https://parroquiasdigitales.com'}/misas`;
        console.log('Redirigiendo a error:', errorUrl);
        res.redirect(errorUrl);
    } catch (error) {
        console.error('Error al verificar pago:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'https://parroquiasdigitales.com'}/misas`);
    }
};