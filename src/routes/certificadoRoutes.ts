import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { 
  crearCertificado, 
  registrarCompraYEnviarCertificado, 
  buscarCertificadosPorDni 
} from '../controllers/certificadoController';
import { verificarCertificado } from '../controllers/verificacionController';
import { 
  crearPreferenciaCertificados, 
  verificarPagoCertificados,  
  procesarWebhookCertificados, 
  completarCompraCertificados, 
  verificarEstadoPagoCertificados
} from '../controllers/certificadoPagoController';

const router = Router();

// Crear certificado
router.post('/crear', asyncHandler(crearCertificado));

// Registrar compra y enviar certificado
router.post('/compra', asyncHandler(registrarCompraYEnviarCertificado));

// Buscar certificados por DNI
router.get('/buscar/:dni', asyncHandler(buscarCertificadosPorDni));

// Ruta para verificar un certificado
router.get('/verificar/:id', asyncHandler(verificarCertificado));

// Crear preferencia para certificados
router.post('/preference', asyncHandler(crearPreferenciaCertificados));

// Verificar estado de pago de certificados
router.get('/verificar', asyncHandler(verificarPagoCertificados));

// Webhook de Mercado Pago para certificados
router.post('/webhook', asyncHandler(procesarWebhookCertificados));

// Completar compra de certificados - CORREGIDO
router.post('/completar', asyncHandler(completarCompraCertificados));

router.get('/estado', asyncHandler(verificarEstadoPagoCertificados));
export default router;