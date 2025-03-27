import express from 'express';
import { 
  crearAfiliado, 
  obtenerAfiliados, 
  obtenerAfiliadoPorId,
  obtenerAfiliadoPorCIP,
  actualizarInfoAfiliacion,
  eliminarAfiliado
} from '../controllers/afiliadoController';

const router = express.Router();

// Rutas para afiliados

import {
    crearPreferenciaAfiliado,
    verificarPagoAfiliado,
    obtenerEstadoPagoAfiliado,
    webhookPagoAfiliado,
    reservarPago
} from '../controllers/pagoController';


// Ruta para crear preferencia de pago para afiliados
router.post('/create_preference', crearPreferenciaAfiliado);
// Ruta para verificar pago de afiliados
router.get('/verificar-pago', verificarPagoAfiliado);
// Ruta para obtener estado de pago de un afiliado
router.get('/:afiliadoId/estado-pago', obtenerEstadoPagoAfiliado);
// In your routes file
router.post('/webhook-pago', webhookPagoAfiliado);
router.post('/reservar-pago', reservarPago);

router.post('/', crearAfiliado);
router.get('/', obtenerAfiliados);
router.get('/cip/:cipNumero', obtenerAfiliadoPorCIP);
router.get('/:id', obtenerAfiliadoPorId);
router.put('/:id', actualizarInfoAfiliacion);
router.delete('/:id', eliminarAfiliado);

export default router;