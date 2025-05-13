import express from 'express';
import { obtenerInformacion, actualizarInformacion } from '../controllers/informacionController';
import { verificarAuth, verificarAdmin } from '../middlewares/authMiddleware';

const router = express.Router();

// Rutas para información
router.get('/', obtenerInformacion);
router.put('/', [verificarAuth, verificarAdmin], actualizarInformacion);

export default router;