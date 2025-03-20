// En un nuevo controlador: pagoController.ts
import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import Afiliado from '../models/Afiliado';

// Configurar MercadoPago con tu access token
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';

// Crear cliente de MercadoPago
const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
const preferenceClient = new Preference(client);

export const crearOrdenPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const { afiliadoId, mesesAfiliacion, monto, correoConfirmacion, descripcion } = req.body;
    
    // Verificar que el afiliado exista
    const afiliado = await Afiliado.findById(afiliadoId);
    if (!afiliado) {
      res.status(404).json({ success: false, mensaje: 'Afiliado no encontrado' });
      return;
    }
    
    // Crear preferencia de pago en MercadoPago
    const body = {
      items: [
        {
          id: '1',
          title: descripcion,
          unit_price: Number(monto),
          quantity: 1,
          currency_id: "PEN"
        }
      ],
      back_urls: {
        success: `${process.env.FRONTEND_URL}/pago-exitoso`,
        failure: `${process.env.FRONTEND_URL}/pago-fallido`,
        pending: `${process.env.FRONTEND_URL}/pago-pendiente`
      },
      auto_return: 'approved',
      external_reference: `${afiliadoId}-${mesesAfiliacion}-${Date.now()}`,
      metadata: {
        afiliadoId,
        correoConfirmacion,
        mesesAfiliacion
      }
    };
    
    const result = await preferenceClient.create({ body });
    
    res.status(200).json({
      success: true,
      init_point: result.init_point,
      preferenceId: result.id
    });
  } catch (error) {
    console.error('Error al crear orden de pago:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al procesar el pago',
      error: (error as Error).message
    });
  }
};

// Si necesitas un método para verificar pagos similar al existente
export const verificarPagoAfiliacion = async (req: Request, res: Response): Promise<void> => {
  try {
    // Lógica para verificar pagos de afiliación
    // Similar a tu verificarPago actual
  } catch (error) {
    console.error('Error al verificar pago de afiliación:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al verificar el pago'
    });
  }
};