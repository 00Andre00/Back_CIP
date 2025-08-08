// nombre: pagoRoutes.ts
import { Router } from 'express';
import {
  crearPreferenciaAfiliado,
  verificarPagoAfiliado,
  obtenerEstadoPagoAfiliado,
  webhookPagoAfiliado,
  reservarPago,
} from '../controllers/pagoController';

const router = Router();

// Crear preferencia de pago para afiliados
router.post('/create_preference', crearPreferenciaAfiliado);

// Verificar pago de afiliados
router.get('/verificar-pago', verificarPagoAfiliado);

// Obtener estado de pago de un afiliado
router.get('/:afiliadoId/estado-pago', obtenerEstadoPagoAfiliado);

// Webhook de MercadoPago para pagos de afiliados
router.post('/webhook-pago', webhookPagoAfiliado);

// Reservar pago de afiliados
router.post('/reservar-pago', reservarPago);

export default router;