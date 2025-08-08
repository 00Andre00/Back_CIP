// nombre: mensualidadRoutes.ts
import { Router } from 'express';
import {
  crearPreferenciaMensualidad,
  reservarPagoMensualidad,
  verificarPagoMensualidad,
  webhookPagoMensualidad,
} from '../controllers/mensualidadController';

const router = Router();

// Crear preferencia de pago para mensualidades
router.post('/create_preference', crearPreferenciaMensualidad);

// Reservar pago de mensualidades
router.post('/reservar-pago', reservarPagoMensualidad);

// Verificar pago exitoso
router.get('/verificar-pago', verificarPagoMensualidad);

// Webhook de MercadoPago para mensualidades
router.post('/webhook-pago', webhookPagoMensualidad);

export default router;