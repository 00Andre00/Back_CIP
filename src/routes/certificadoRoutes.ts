import express from 'express';
import { enviarCertificadoHabilidad } from '../controllers/certificadoController';

const router = express.Router();

router.post('/enviar-habilidad', enviarCertificadoHabilidad as any);

export default router;