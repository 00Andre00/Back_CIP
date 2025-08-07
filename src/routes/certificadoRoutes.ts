// routes/certificadoRoutes.ts
import express from 'express';
import {
  crearPreferenciaCertificado,
  reservarPagoCertificado,
  verificarPagoCertificado,
  webhookPagoCertificado,
  verificarCertificadoPorToken,
  enviarCertificadoHabilidad
} from '../controllers/certificadoController';
import { verificarCertificado } from '../controllers/verificacionController';
const router = express.Router();

// RUTAS PRINCIPALES PARA CERTIFICADOS

// 1. Crear preferencia de pago para certificado (llamada desde frontend)
router.post('/create_preference_certificado', crearPreferenciaCertificado);

// 2. Reservar pago de certificado (callback onSubmit del wallet)
router.post('/reservar-pago', reservarPagoCertificado);

// 3. Verificar pago exitoso (callback de MercadoPago)
router.get('/verificar-pago-certificado', verificarPagoCertificado);

// 4. Webhook de MercadoPago para certificados
router.post('/webhook-pago-certificado', webhookPagoCertificado);

// 5. Verificar certificado por token/ID (para validación pública)
router.get('/verificar/:token', verificarCertificadoPorToken);


router.post('/enviar-habilidad', enviarCertificadoHabilidad as any);
router.get('/verificar/:id', verificarCertificado as any);
export default router;