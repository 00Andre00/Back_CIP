// nombre del archivo: certificadoController.ts
import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import Afiliado from '../models/Afiliado';
import Certificado from '../models/Certificado';
import Mensualidad from '../models/Mensualidad';
import { enviarCorreoCertificadoHabilidad } from '../utils/emailService';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
}

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 1000 },
});

interface CertificadoOrderData {
  title: string;
  quantity: number;
  price: number;
  afiliadoId: string;
  certificadoId: string | null;
  tipoPago: 'certificado';
}

// Función auxiliar para actualizar certificado y enviar correo
const actualizarCertificadoYEnviarCorreo = async (certificadoPendiente: any, paymentId: string) => {
  certificadoPendiente.estado = 'pagado';
  certificadoPendiente.pagoId = paymentId;
  certificadoPendiente.fechaPago = new Date();
  certificadoPendiente.fechaVigencia = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); // Vigencia de 1 año
  await certificadoPendiente.save();

  const afiliado = certificadoPendiente.afiliado as any;
  const certificadoData = {
    ingeniero: {
      nombres: afiliado.nombre.split(' ')[0] || afiliado.nombre,
      apellidos: afiliado.nombre.split(' ').slice(1).join(' ') || '',
      consejoDepartamental: afiliado.consejoDepartamental,
      registroCIP: afiliado.cipNumero,
      especialidad: afiliado.especialidad,
      fechaIncorporacion: afiliado.fechaInicioPago,
    },
    fechaVigencia: certificadoPendiente.fechaVigencia,
    _id: certificadoPendiente.id.toString(),
  };

  await enviarCorreoCertificadoHabilidad(
    {
      nombre: afiliado.nombre.split(' ')[0] || afiliado.nombre,
      apellido: afiliado.nombre.split(' ').slice(1).join(' ') || '',
      email: afiliado.correo,
    },
    certificadoData
  );
};

export const crearPreferenciaCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== CREANDO PREFERENCIA CERTIFICADO ===');
    console.log('Datos recibidos:', req.body);

    const { title, quantity, price, afiliadoId, certificadoId }: CertificadoOrderData = req.body;

    if (!afiliadoId || !title || !quantity || !price) {
      console.error('Error: Datos incompletos', { afiliadoId, title, quantity, price });
      res.status(400).json({ error: 'Datos de certificado incompletos' });
      return;
    }

    const afiliado = await Afiliado.findById(afiliadoId);
    if (!afiliado) {
      console.error(`Afiliado no encontrado: ${afiliadoId}`);
      res.status(404).json({ error: 'Afiliado no encontrado' });
      return;
    }

    // Verificar que no haya mensualidades pendientes
    const mensualidadesPendientes = await Mensualidad.find({
      afiliadoId,
      pagado: false,
      fechaVencimiento: { $lte: new Date() },
    });
    if (mensualidadesPendientes.length > 0) {
      console.error(`Afiliado no está al día: ${afiliado.estadoPago}`);
      res.status(400).json({
        error: 'No puedes obtener el certificado. Debes estar al día con tus pagos.',
        estadoPago: afiliado.estadoPago,
      });
      return;
    }

    const body = {
      items: [
        {
          id: 'certificado-1',
          title,
          quantity: Number(quantity),
          unit_price: Number(price),
          currency_id: 'PEN',
          description: `Certificado de Habilitación CIP para ${afiliado.nombre}`,
        },
      ],
      back_urls: {
        success: `${process.env.BACKEND_URL}/api/certificados/verificar-pago-certificado`,
        failure: `${process.env.FRONTEND_URL}?status=failure`,
        pending: `${process.env.FRONTEND_URL}?status=pending`,
      },
      metadata: {
        afiliadoId,
        certificadoId: certificadoId || 'new-certificate',
        tipoPago: 'certificado',
        precio: Number(price),
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL}/api/certificados/webhook-pago-certificado`,
    };

    console.log('Cuerpo de preferencia certificado:', body);

    const preference = new Preference(client);
    const result = await preference.create({ body });

    console.log('✅ Preferencia de certificado creada:', result.id);

    res.json({
      id: result.id,
      init_point: result.init_point,
    });
  } catch (error) {
    console.error('❌ Error al crear preferencia de certificado:', error);
    res.status(500).json({
      error: 'Error al crear la preferencia de pago del certificado',
      detalle: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const reservarPagoCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== RESERVANDO PAGO DE CERTIFICADO ===');
    console.log('Datos recibidos:', req.body);

    const { afiliadoId, pagoId, tipoPago, certificadoId, precio } = req.body;

    if (!afiliadoId || !pagoId) {
      res.status(400).json({ error: 'Datos insuficientes para reservar pago' });
      return;
    }

    const afiliado = await Afiliado.findById(afiliadoId);
    if (!afiliado) {
      res.status(404).json({ error: 'Afiliado no encontrado' });
      return;
    }

    const mensualidadesPendientes = await Mensualidad.find({
      afiliadoId,
      pagado: false,
      fechaVencimiento: { $lte: new Date() },
    });
    if (mensualidadesPendientes.length > 0) {
      res.status(400).json({
        error: 'No puedes obtener el certificado. Debes estar al día con tus pagos.',
      });
      return;
    }

    let certificadoPendiente = await Certificado.findOne({
      afiliado: afiliadoId,
      preferenceId: pagoId,
      estado: 'pendiente',
    });

    if (certificadoPendiente) {
      console.log('Certificado pendiente ya existe');
      res.status(200).json({
        message: 'Certificado pendiente confirmado',
        certificadoId: certificadoPendiente._id,
      });
    } else {
      const nuevoCertificado = new Certificado({
        afiliado: afiliadoId,
        preferenceId: pagoId,
        estado: 'pendiente',
        precio: precio || 15.00,
        tipoPago: 'certificado',
        fechaCreacion: new Date(),
      });

      await nuevoCertificado.save();
      console.log('✅ Nuevo certificado pendiente creado');

      res.status(200).json({
        message: 'Certificado registrado para pago',
        certificadoId: nuevoCertificado._id,
      });
    }
  } catch (error) {
    console.error('❌ Error al reservar pago de certificado:', error);
    res.status(500).json({
      error: 'Error al reservar el pago del certificado',
      detalle: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const verificarPagoCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== VERIFICANDO PAGO DE CERTIFICADO ===');
    const { payment_id, status, preference_id } = req.query;

    if (status === 'approved' && preference_id) {
      const certificadoPendiente = await Certificado.findOne({
        preferenceId: preference_id,
        estado: 'pendiente',
      }).populate('afiliado');

      if (certificadoPendiente && certificadoPendiente.afiliado) {
        await actualizarCertificadoYEnviarCorreo(certificadoPendiente, payment_id as string);
        console.log('✅ Certificado enviado por correo');
        res.redirect(`${process.env.FRONTEND_URL}?status=success`);
      } else {
        console.error('No se encontró certificado pendiente');
        res.redirect(`${process.env.FRONTEND_URL}?status=error`);
      }
    } else {
      console.error('Pago no aprobado o datos inválidos');
      res.redirect(`${process.env.FRONTEND_URL}?status=error`);
    }
  } catch (error) {
    console.error('❌ Error al verificar pago de certificado:', error);
    res.redirect(`${process.env.FRONTEND_URL}?status=error`);
  }
};

export const webhookPagoCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== WEBHOOK CERTIFICADO RECIBIDO ===');
    console.log('Datos webhook:', req.body);

    const { type, data } = req.body;

    if (type === 'payment') {
      const paymentId = data.id;
      const payment = new Payment(client);
      const paymentDetails = await payment.get({ id: paymentId });

      console.log('Detalles del pago certificado:', {
        id: paymentDetails.id,
        status: paymentDetails.status,
        preferenceId: paymentDetails.metadata?.preference_id,
      });

      if (paymentDetails.status === 'approved') {
        const certificadoPendiente = await Certificado.findOne({
          preferenceId: paymentDetails.metadata.preference_id,
          estado: 'pendiente',
        }).populate('afiliado');

        if (certificadoPendiente && certificadoPendiente.afiliado) {
          console.log('✅ Certificado pendiente encontrado');
          await actualizarCertificadoYEnviarCorreo(certificadoPendiente, paymentId);
          console.log('✅ Certificado procesado y enviado por webhook');
        } else {
          console.log('No se encontró certificado pendiente para preferencia:', paymentDetails.metadata?.preference_id);
        }
      } else {
        console.log('Pago de certificado no aprobado, status:', paymentDetails.status);
      }
    }

    res.status(200).send('Webhook certificado procesado');
  } catch (error) {
    console.error('❌ Error en webhook de certificado:', error);
    res.status(500).send('Error en webhook certificado');
  }
};

export const verificarCertificadoPorToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ error: 'Token requerido' });
      return;
    }

    const certificado = await Certificado.findById(token).populate('afiliado', 'nombre cipNumero especialidad consejoDepartamental');

    if (!certificado || certificado.estado !== 'pagado') {
      res.status(404).json({
        error: 'Certificado no válido o no encontrado',
        valido: false,
      });
      return;
    }

    res.json({
      valido: true,
      certificado: {
        _id: certificado._id,
        fechaVigencia: certificado.fechaVigencia,
        fechaPago: certificado.fechaPago,
        afiliado: certificado.afiliado,
      },
    });
  } catch (error) {
    console.error('Error al verificar certificado:', error);
    res.status(500).json({
      error: 'Error al verificar certificado',
      valido: false,
    });
  }
};

export const enviarCertificadoHabilidad = async (req: Request, res: Response) => {
  try {
    const { nombre, apellido, email, ingeniero, fechaVigencia, certificadoId } = req.body;

    if (!email || !nombre || !apellido || !ingeniero || !fechaVigencia || !certificadoId) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos',
      });
    }

    await enviarCorreoCertificadoHabilidad(
      { nombre, apellido, email },
      { ingeniero, fechaVigencia, _id: certificadoId }
    );

    res.status(200).json({
      success: true,
      message: 'Certificado enviado correctamente al correo',
      data: { email, fechaVigencia, certificadoId },
    });
  } catch (error) {
    console.error('Error al enviar certificado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el certificado',
      error: (error as Error).message,
    });
  }
};