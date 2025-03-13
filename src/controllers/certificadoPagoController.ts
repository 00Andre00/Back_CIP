import { Request, Response } from 'express';
import UsuarioNormal from '../models/UsuarioNormal';
import Certificado, { ICertificado } from '../models/Certificado';
import CompraCertificado from '../models/CompraCertificado';
import { enviarCorreoCertificado } from '../utils/emailService';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// Configurar MercadoPago con tu access token
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-a29d72dc-8d29-4015-8805-a13a13e12ea3';

// Crear cliente de MercadoPago
const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

/**
 * Crea una preferencia de pago para certificados en MercadoPago
 */
export const crearPreferenciaPagoCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('Access token no configurado');
    }

    const { certificadoId, usuarioDni, email, precio } = req.body;

    // Obtener datos del certificado para descripción
    const certificado = await Certificado.findById(certificadoId);
    if (!certificado) {
      res.status(404).json({ message: 'Certificado no encontrado' });
      return;
    }

    // Obtener datos del usuario
    const usuario = await UsuarioNormal.findOne({ dni: usuarioDni });
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    // Registrar la compra como pendiente
    const compra = await CompraCertificado.create({
      usuarioId: usuario._id,
      certificadoId,
      email,
      estadoPago: 'pendiente'
    }) as any;

    // Crear título descriptivo según el tipo de certificado
    const titulos = {
      'bautizo': 'Certificado de Bautizo',
      'confirmacion': 'Certificado de Confirmación',
      'matrimonio': 'Certificado de Matrimonio'
    };
    
    const titulo = titulos[certificado.tipo] || 'Certificado';
    const descripcion = `${titulo} para ${usuario.nombre} ${usuario.apellido}`;

    const body = {
      items: [
        {
          id: certificado._id.toString(),
          title: titulo,
          quantity: 1,
          unit_price: Number(precio),
          currency_id: "PEN",
          description: descripcion
        }
      ],
      back_urls: {
        success: `${process.env.BACKEND_URL || ''}/api/certificados/verificar-pago`,
        failure: `${process.env.FRONTEND_URL || ''}/sistema`,
        pending: `${process.env.FRONTEND_URL || ''}/sistema`
      },
      metadata: {
        compraId: compra._id.toString(),
        usuarioDni: usuarioDni,
        email,
        certificadoId: certificado._id.toString(),
        tipo: certificado.tipo
      },
      auto_return: "approved"
    };

    const preference = new Preference(client);
    const result = await preference.create({ body });

    // Guardar el ID de preferencia en la compra
    compra.preferenceId = result.id;
    await compra.save();

    // También actualizamos el certificado con el ID de pago
    certificado.pagoId = result.id;
    await certificado.save();

    res.json({
      id: result.id,
      init_point: result.init_point
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: "Error al crear la preferencia de pago de certificado"
    });
  }
};

/**
 * Recibe y procesa notificaciones de MercadoPago sobre el estado de los pagos
 */
export const webhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, data } = req.query;
    
    console.log('Notificación recibida en webhook:', { type, data });
    
    // Procesar solo notificaciones de pago
    if (type === 'payment') {
      let paymentId: string;
      
      // Extraer el ID del pago
      if (typeof data === 'string') {
        try {
          const parsedData = JSON.parse(data);
          paymentId = parsedData.id;
        } catch (e) {
          paymentId = data;
        }
      } else if (data && typeof data === 'object' && 'id' in data) {
        paymentId = String(data.id);
      } else {
        console.error('Formato de ID de pago no reconocido:', data);
        res.status(400).send('Invalid payment ID format');
        return;
      }
      
      console.log('Obteniendo información del pago:', paymentId);
      
      // Obtener información del pago desde MercadoPago
      const payment = await paymentClient.get({ id: paymentId });
      
      if (!payment) {
        console.error('No se pudo obtener información del pago:', paymentId);
        res.status(404).send('Payment not found');
        return;
      }
      
      // Verificar si el pago está aprobado
      if (payment.status === 'approved') {
        // Obtener el ID de preferencia
        const preferenceId = payment.metadata?.preference_id || '';
        
        if (!preferenceId) {
          console.error('ID de preferencia no encontrado en el pago:', payment);
          res.status(400).send('Preference ID not found');
          return;
        }
        
        // Actualizar tanto la compra como el certificado
        const compra = await CompraCertificado.findOne({ preferenceId });
        
        if (compra) {
          // Actualizar la compra
          compra.estadoPago = 'pagado';
          await compra.save();
          
          console.log('Compra actualizada como pagada:', compra._id);
          
          // Actualizar el certificado
          const certificado = await Certificado.findById(compra.certificadoId);
          if (certificado) {
            certificado.pagado = true;
            certificado.fechaPago = new Date();
            certificado.estadoPago = 'pagado';
            await certificado.save();
            
            console.log('Certificado actualizado como pagado:', certificado._id);
            
            // Enviar correo con el certificado
            try {
              const usuario = await UsuarioNormal.findById(compra.usuarioId);
              
              if (usuario) {
                await enviarCorreoCertificado(
                  { nombre: usuario.nombre, apellido: usuario.apellido, email: compra.email },
                  certificado
                );
                console.log('Correo con certificado enviado a:', compra.email);
              }
            } catch (emailError) {
              console.error('Error al enviar correo con certificado:', emailError);
            }
          }
        } else {
          // Si no encontramos por preferenceId, buscamos directamente el certificado
          const certificado = await Certificado.findOne({ pagoId: preferenceId });
          
          if (certificado) {
            certificado.pagado = true;
            certificado.fechaPago = new Date();
            certificado.estadoPago = 'pagado';
            await certificado.save();
            
            console.log('Certificado actualizado como pagado (sin compra asociada):', certificado._id);
            
            // Intentar recuperar la información del usuario desde los metadatos
            if (payment.metadata && payment.metadata.usuarioDni) {
              const usuario = await UsuarioNormal.findOne({ dni: payment.metadata.usuarioDni });
              
              if (usuario && payment.metadata.email) {
                // Crear la compra si no existía
                const nuevaCompra = await CompraCertificado.create({
                  usuarioId: usuario._id,
                  certificadoId: certificado._id,
                  email: payment.metadata.email,
                  estadoPago: 'pagado',
                  preferenceId,
                  fechaCompra: new Date()
                });
                
                console.log('Nueva compra registrada desde webhook:', nuevaCompra._id);
                
                // Enviar correo
                await enviarCorreoCertificado(
                  { nombre: usuario.nombre, apellido: usuario.apellido, email: payment.metadata.email },
                  certificado
                );
              }
            }
          } else {
            console.warn('No se encontró certificado ni compra para preferenceId:', preferenceId);
          }
        }
      } else {
        console.log('Pago no aprobado, estado:', payment.status);
      }
    }
    
    // Siempre responder con éxito para que MercadoPago no reintente
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook:', error);
    // Respondemos con 200 incluso en caso de error para evitar reintentos
    res.status(200).send('OK');
  }
};

/**
 * Busca y verifica el estado de pago de una compra de certificado
 */
export const verificarPagoCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { payment_id, status, preference_id } = req.query;
    
    console.log('Verificando pago de certificado:', { payment_id, status, preference_id });
    
    if (status === 'approved' && preference_id) {
      // Buscar el certificado por pagoId
      const certificado = await Certificado.findOne({ pagoId: preference_id });
      
      if (certificado) {
        // Actualizar el certificado
        certificado.pagado = true;
        certificado.fechaPago = new Date();
        certificado.estadoPago = 'pagado';
        await certificado.save();
        
        // Buscar la compra asociada
        const compra = await CompraCertificado.findOne({ preferenceId: preference_id });
        
        if (compra) {
          compra.estadoPago = 'pagado';
          await compra.save();
        }
        
        // Redirigir a la página de éxito
        const redirectUrl = `${process.env.FRONTEND_URL || 'https://parroquiasdigitales.com'}/sistema`;
        
        // Cookie para mostrar mensaje de éxito
        res.cookie('certificadoComprado', certificado._id, { 
          maxAge: 60000,
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production'
        });
        
        res.redirect(redirectUrl);
        return;
      }
    }
    
    // Si no hay certificado o no está aprobado, redirigir a la página de error
    const errorUrl = `${process.env.FRONTEND_URL || 'https://parroquiasdigitales.com'}/sistema`;
    res.redirect(errorUrl);
  } catch (error) {
    console.error('Error al verificar pago de certificado:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'https://parroquiasdigitales.com'}/sistema`);
  }
};


// Crear un certificado y vincularlo al usuario
export const crearCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dni, ...certData } = req.body;

    // Buscar usuario por DNI
    const usuario = await UsuarioNormal.findOne({ dni });
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    // Crear el nuevo certificado (se incluirán todos los campos enviados)
    const nuevoCertificado = await Certificado.create(certData);

    // Vincular el certificado al usuario
    usuario.certificados.push(nuevoCertificado);
    await usuario.save();

    res.status(201).json({
      message: 'Certificado creado correctamente',
      certificado: nuevoCertificado,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({ message: 'Error interno del servidor', error: errorMessage });
  }
};

// Registrar compra y enviar el certificado (sin cambios)
export const registrarCompraYEnviarCertificado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { certificadoId, email, dni } = req.body;  // Get DNI from request

    const certificado = await Certificado.findById(certificadoId);
    if (!certificado) {
      res.status(404).json({ message: 'Certificado no encontrado' });
      return;
    }

    // Find user by DNI instead of ID
    const usuario = await UsuarioNormal.findOne({ dni });
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    // Rest of your function remains the same
    await CompraCertificado.create({
      usuarioId: usuario._id,
      certificadoId: certificado._id,
      email,
    });

    await enviarCorreoCertificado(
      { nombre: usuario.nombre, apellido: usuario.apellido, email },
      certificado
    );

    res.status(201).json({
      message: 'Compra registrada y certificado enviado correctamente',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({ message: 'Error interno del servidor', error: errorMessage });
  }
};

// Buscar certificados por DNI (sin cambios)
export const buscarCertificadosPorDni = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dni } = req.params;
    console.log('Buscando DNI:', dni);
    
    const usuario = await UsuarioNormal.findOne({ dni }).populate('certificados');
    console.log('Usuario encontrado:', usuario);
    
    if (!usuario) {
      console.log('Usuario no encontrado');
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    const compras = await CompraCertificado.find({ usuarioId: usuario._id }).populate('certificadoId');

    res.status(200).json({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      certificados: usuario.certificados,
      compras: compras.map(compra => ({
        certificadoId: compra.certificadoId,
        email: compra.email,
        fechaCompra: compra.fechaCompra,
      }))
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({ message: 'Error interno del servidor', error: errorMessage });
  }
};
