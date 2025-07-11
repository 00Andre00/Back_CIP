import express from 'express';
import { enviarCertificadoHabilidad } from '../controllers/certificadoController';
import { verificarCertificado } from '../controllers/verificacionController';
const router = express.Router();

router.post('/enviar-habilidad', enviarCertificadoHabilidad as any);
router.get('/verificar/:id', verificarCertificado as any);
export default router;