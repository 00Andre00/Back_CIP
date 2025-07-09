// nombre de archivo : pagoRoutes.ts
import express from 'express';
import {
    crearPreferenciaAfiliado,
    verificarPagoAfiliado,
    obtenerEstadoPagoAfiliado
} from '../controllers/pagoController';
import { arch } from 'os';

const router = express.Router();

// Ruta para crear preferencia de pago para afiliados
router.post('/create_preference', crearPreferenciaAfiliado);

// Ruta para verificar pago de afiliados
router.get('/verificar-pago', verificarPagoAfiliado);

// Ruta para obtener estado de pago de un afiliado
router.get('/:afiliadoId/estado-pago', obtenerEstadoPagoAfiliado);

export default router;