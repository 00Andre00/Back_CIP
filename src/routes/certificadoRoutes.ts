import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { 
  crearCertificado, 
  registrarCompraYEnviarCertificado, 
  buscarCertificadosPorDni 
} from '../controllers/certificadoController';
import { verificarCertificado } from '../controllers/verificacionController';
import {
  crearPreferenciaPagoCertificado,
  webhook,
  verificarPagoCertificado
} from '../controllers/certificadoPagoController';

const router = Router();

// Rutas para certificados
router.post('/crear', asyncHandler(crearCertificado));
router.post('/compra', asyncHandler(registrarCompraYEnviarCertificado));
router.get('/buscar/:dni', asyncHandler(buscarCertificadosPorDni));
router.get('/verificar/:id', asyncHandler(verificarCertificado));

// Rutas para MercadoPago
router.post('/create_preference', asyncHandler(crearPreferenciaPagoCertificado));
router.post('/webhook', asyncHandler(webhook));
router.get('/webhook', asyncHandler(webhook));  // MercadoPago puede usar GET o POST
router.get('/verificar-pago', asyncHandler(verificarPagoCertificado));

export default router;