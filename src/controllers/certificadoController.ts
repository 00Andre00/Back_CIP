// certificadoController.ts
import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import Afiliado from '../models/Afiliado';
// Asumiendo que tienes un modelo de Certificado o PagoCertificado
// import Certificado from '../models/Certificado';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
}

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 1000 },
});

// Crear preferencia específica para certificados
export const crearPreferenciaCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== CREANDO PREFERENCIA CERTIFICADO ===');
    console.log('Datos recibidos:', req.body);

    const { title, quantity, price, afiliadoId, certificadoId, tipoPago } = req.body;

    // Validaciones básicas
    if (!afiliadoId || !title || !quantity || !price || tipoPago !== 'certificado') {
      console.error('Error: Datos incompletos para certificado', { 
        afiliadoId, title, quantity, price, tipoPago 
      });
      res.status(400).json({ 
        error: 'Datos de pago de certificado incompletos',
        detalles: 'Se requieren: afiliadoId, title, quantity, price, tipoPago=certificado'
      });
      return;
    }

    // Verificar que el afiliado existe
    const afiliado = await Afiliado.findById(afiliadoId);
    if (!afiliado) {
      console.error(`Error: Afiliado no encontrado con ID ${afiliadoId}`);
      res.status(404).json({ error: 'Afiliado no encontrado' });
      return;
    }

    // Crear el cuerpo de la preferencia específico para certificado
    const body = {
      items: [
        {
          id: certificadoId || 'certificado-habilitacion',
          title: title,
          quantity: Number(quantity),
          unit_price: Number(price),
          currency_id: 'PEN',
          description: `Certificado de Habilitación CIP para ${afiliado.nombre}`,
          category_id: 'services', // Categoría para servicios
        },
      ],
      back_urls: {
        success: `${process.env.BACKEND_URL}/api/certificados/verificar-pago`,
        failure: `${process.env.FRONTEND_URL}?status=failure&type=certificado`,
        pending: `${process.env.FRONTEND_URL}?status=pending&type=certificado`,
      },
      metadata: {
        afiliadoId,
        certificadoId: certificadoId || 'new-certificate',
        tipoPago: 'certificado',
        precio: Number(price)
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL}/api/certificados/webhook-pago`,
      // Configuraciones adicionales para certificado
      payment_methods: {
        excluded_payment_types: [
          { id: 'ticket' }, // Excluir pagos en efectivo
          { id: 'atm' }     // Excluir cajeros automáticos
        ],
        installments: 1, // Solo permitir pago en 1 cuota para certificados
      },
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
    };

    console.log('Cuerpo de preferencia de certificado:', JSON.stringify(body, null, 2));

    // Crear la preferencia
    const preference = new Preference(client);
    const result = await preference.create({ body });

    console.log('✅ Preferencia de certificado creada:', {
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point
    });

    // Aquí podrías guardar el registro del certificado pendiente
    /*
    const nuevoCertificado = new Certificado({
      afiliado: afiliadoId,
      preferenceId: result.id,
      estado: 'pendiente',
      precio: Number(price),
      tipo: 'habilitacion',
      certificadoId: certificadoId || 'new-certificate'
    });
    await nuevoCertificado.save();
    */

    // Responder con la preferencia
    res.json({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point, // Para testing
      metadata: {
        afiliadoId,
        certificadoId,
        tipoPago: 'certificado'
      }
    });

  } catch (error) {
    console.error('❌ Error detallado al crear preferencia de certificado:', error);
    
    // Manejar errores específicos de MercadoPago
    if (error && typeof error === 'object' && 'cause' in error) {
      console.error('Error de MercadoPago:', error.cause);
    }
    
    res.status(500).json({
      error: 'Error al crear la preferencia de pago del certificado',
      detalle: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    });
  }
};

// Verificar pago de certificado
export const verificarPagoCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== VERIFICANDO PAGO CERTIFICADO ===');
    console.log('Query params:', req.query);

    const { payment_id, status, preference_id } = req.query;

    if (status === 'approved' && preference_id) {
      console.log('✅ Pago de certificado aprobado:', { payment_id, preference_id });
      
      // Aquí actualizarías el estado del certificado
      /*
      const certificadoPendiente = await Certificado.findOne({ 
        preferenceId: preference_id 
      }).populate('afiliado');

      if (certificadoPendiente) {
        certificadoPendiente.estado = 'pagado';
        certificadoPendiente.pagoId = payment_id as string;
        certificadoPendiente.fechaPago = new Date();
        await certificadoPendiente.save();
        
        // Aquí podrías enviar el certificado por email
        // await enviarCertificadoPorEmail(certificadoPendiente);
      }
      */

      res.redirect(`${process.env.FRONTEND_URL}?status=success&type=certificado`);
    } else {
      console.log('❌ Pago de certificado no aprobado:', { status, preference_id });
      res.redirect(`${process.env.FRONTEND_URL}?status=error&type=certificado`);
    }
  } catch (error) {
    console.error('❌ Error al verificar pago de certificado:', error);
    res.redirect(`${process.env.FRONTEND_URL}?status=error&type=certificado`);
  }
};

// Reservar pago de certificado
export const reservarPagoCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== RESERVANDO PAGO CERTIFICADO ===');
    console.log('Datos recibidos:', req.body);

    const { afiliadoId, pagoId, tipoPago, certificadoId, precio } = req.body;

    // Validaciones
    if (!afiliadoId || !pagoId || tipoPago !== 'certificado') {
      res.status(400).json({ 
        error: 'Datos incompletos para reservar pago de certificado' 
      });
      return;
    }

    // Verificar que el afiliado existe
    const afiliado = await Afiliado.findById(afiliadoId);
    if (!afiliado) {
      res.status(404).json({ error: 'Afiliado no encontrado' });
      return;
    }

    // Aquí registrarías la reserva del certificado
    /*
    let certificadoPendiente = await Certificado.findOne({
      preferenceId: pagoId,
      estado: 'pendiente'
    });

    if (!certificadoPendiente) {
      certificadoPendiente = new Certificado({
        afiliado: afiliadoId,
        preferenceId: pagoId,
        estado: 'pendiente',
        precio: precio || 15.00,
        certificadoId: certificadoId || 'new-certificate',
        tipo: 'habilitacion'
      });
      await certificadoPendiente.save();
    }
    */

    console.log('✅ Pago de certificado reservado correctamente');

    res.status(200).json({
      message: 'Pago de certificado reservado exitosamente',
      // reservaId: certificadoPendiente._id,
      tipoPago: 'certificado',
      afiliadoId,
      certificadoId
    });

  } catch (error) {
    console.error('❌ Error al reservar pago de certificado:', error);
    res.status(500).json({
      error: 'Error al reservar el pago del certificado',
      detalle: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

// Webhook para certificados
export const webhookPagoCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== WEBHOOK CERTIFICADO ===');
    console.log('Webhook body:', req.body);

    const { type, data } = req.body;

    if (type === 'payment') {
      // Manejar la notificación de pago de certificado
      console.log('Procesando pago de certificado ID:', data.id);
      
      // Aquí procesarías la confirmación final del certificado
    }

    res.status(200).send('Webhook de certificado recibido');
  } catch (error) {
    console.error('❌ Error en webhook de certificado:', error);
    res.status(500).send('Error en webhook de certificado');
  }
};