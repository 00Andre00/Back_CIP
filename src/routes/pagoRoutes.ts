import express from 'express';
import {
    crearPreferenciaAfiliado,
    verificarPagoAfiliado,
    webhookPagoAfiliado,
    reservarPago,
    obtenerEstadoPagoAfiliado
  } from '../controllers/pagoController'; // Asumiendo que separaste el controlador de pagos
  // === RUTAS DE PAGOS MERCADOPAGO ===

  const router = express.Router();

router.post('/create_preference', crearPreferenciaAfiliado);
router.get('/verificar-pago', verificarPagoAfiliado);
router.post('/webhook-pago', webhookPagoAfiliado);
router.post('/reservar-pago', reservarPago);
router.get('/estado-pago/:afiliadoId', obtenerEstadoPagoAfiliado);

export default router;