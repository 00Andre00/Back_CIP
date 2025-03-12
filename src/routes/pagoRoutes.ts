import { crearPreferencia, verificarPago } from '../controllers/pagoController';
import asyncHandler  from 'express-async-handler';
import { crearPreferenciaCertificados, verificarPagoCertificados, procesarWebhookCertificados, completarCompraCertificados } from '../controllers/certificadoPagoController';
import { handleWebhook } from '../controllers/webhookController';
import express from 'express';

const router = express.Router();

// Rutas para pagos generales
router.post('/create_preference', crearPreferencia);
router.get('/verificar', verificarPago);
router.post('/webhook', handleWebhook);

export default router;