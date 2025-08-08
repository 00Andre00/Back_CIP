// certificadoRoutes.ts
import express from 'express';
import {
  crearPreferenciaCertificado,
  verificarPagoCertificado,
  reservarPagoCertificado,
  webhookPagoCertificado
} from '../controllers/certificadoController';

const router = express.Router();

// Crear preferencia de pago para certificado
router.post('/create_preference_certificado', crearPreferenciaCertificado);

// Verificar pago de certificado
router.get('/verificar-pago', verificarPagoCertificado);

// Reservar pago de certificado
router.post('/reservar-pago', reservarPagoCertificado);

// Webhook para notificaciones de pago de certificado
router.post('/webhook-pago', webhookPagoCertificado);

export default router;